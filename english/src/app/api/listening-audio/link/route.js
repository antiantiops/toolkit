import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { cacheOwner } from '../../session/owner';
import { saveSession } from '../../session/storage';
import { history } from '../../session/listening-history';
import { normalizeTargetLang } from '../../../../lib/lookup/languages.mjs';

const AUDIO_DIR = process.env.LISTENING_AUDIO_DIR || path.join(process.env.CACHE_DIR || path.join(os.tmpdir(), 'vocab_cache'), 'listening-audio');
const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_REQ_BYTES = 4096;
const REQ_READ_TIMEOUT_MS = 10000;
const MAX_BYTES = 40 * 1024 * 1024;
const MAX_CONCURRENT = 2;
const ALLOWED_HOST = 'ieltsextremes.com';
const FETCH_TIMEOUT_MS = 30000;
const headers = { 'Cache-Control': 'private, no-store' };
const inFlight = globalThis.listeningAudioLinkImports ||= { count: 0 };

const reply = (data, status = 200) => NextResponse.json(data, { status, headers });

function clean() {
  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    for (const name of fs.readdirSync(AUDIO_DIR)) {
      const file = path.join(AUDIO_DIR, name);
      if (Date.now() - fs.statSync(file).mtimeMs > TTL) fs.unlinkSync(file);
    }
  } catch {}
}

function parseDirectMp3Url(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  let url;
  try { url = new URL(trimmed); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.hostname.toLowerCase() !== ALLOWED_HOST) return null;
  if (url.port && url.port !== '443') return null;
  let decodedPath;
  try { decodedPath = decodeURIComponent(url.pathname); } catch { return null; }
  if (!/\.mp3$/i.test(decodedPath)) return null;
  return url;
}

function sanitizeAudioName(pathname) {
  const seg = decodeURIComponent(String(pathname || '').split('/').pop() || '');
  const cleaned = seg.replace(/[\u0000-\u001f\u007f\\/]+/g, '_').replace(/^\.+/, '').trim().slice(0, 180);
  if (!cleaned || cleaned.toLowerCase() === '.mp3') return 'audio.mp3';
  return /\.mp3$/i.test(cleaned) ? cleaned : `${cleaned}.mp3`;
}

function isMp3Bytes(bytes) {
  if (!bytes || bytes.length < 3) return false;
  return bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
}

async function readBoundedStream(stream, maxBytes, timeoutMs, emptyStatus, emptyError, tooLargeError) {
  const reader = stream?.getReader?.();
  if (!reader) return { error: emptyError, status: emptyStatus };
  const chunks = [];
  let total = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    reader.cancel(new DOMException('Read timed out', 'TimeoutError')).catch(() => {});
  }, timeoutMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { error: tooLargeError, status: 413 };
      }
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel().catch(() => {});
    if (timedOut) {
      const err = new Error('Read timed out');
      err.name = 'TimeoutError';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) {
    const err = new Error('Read timed out');
    err.name = 'TimeoutError';
    throw err;
  }
  if (!total) return { error: emptyError, status: emptyStatus };
  return { bytes: Buffer.concat(chunks, total) };
}

async function readBoundedRequestJson(request) {
  const rawLen = request.headers.get('content-length');
  if (rawLen !== null) {
    const len = Number(rawLen);
    if (Number.isFinite(len) && len > MAX_REQ_BYTES) {
      await request.body?.cancel?.().catch(() => {});
      return { error: 'Dữ liệu quá dài', status: 413 };
    }
  }
  const result = await readBoundedStream(
    request.body,
    MAX_REQ_BYTES,
    REQ_READ_TIMEOUT_MS,
    400,
    'Dữ liệu JSON không hợp lệ',
    'Dữ liệu quá dài'
  );
  if (result.error) return result;
  try {
    return { data: JSON.parse(result.bytes.toString('utf8')) };
  } catch {
    return { error: 'Dữ liệu JSON không hợp lệ', status: 400 };
  }
}

async function readBoundedMp3(response) {
  const rawLen = response.headers.get('content-length');
  if (rawLen !== null) {
    const len = Number(rawLen);
    if (Number.isFinite(len) && len > MAX_BYTES) {
      await response.body?.cancel?.().catch(() => {});
      return { error: 'File MP3 vượt quá giới hạn 40 MB', status: 413 };
    }
  }
  return readBoundedStream(
    response.body,
    MAX_BYTES,
    FETCH_TIMEOUT_MS,
    422,
    'Link không trả về dữ liệu audio',
    'File MP3 vượt quá giới hạn 40 MB'
  );
}

export async function POST(request) {
  const owner = cacheOwner(request);
  if (!owner) return reply({ error: 'Cần đăng nhập qua Kong' }, 401);
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') return reply({ error: 'Invalid origin' }, 403);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin && origin !== 'https://english.nimtechnology.com') {
    return reply({ error: 'Invalid origin' }, 403);
  }
  if (inFlight.count >= MAX_CONCURRENT) return reply({ error: 'Đang bận, thử lại sau' }, 429);
  inFlight.count++;
  try {
    clean();
    let reqBody;
    try {
      reqBody = await readBoundedRequestJson(request);
    } catch (e) {
      return reply({ error: e?.name === 'TimeoutError' ? 'Đọc yêu cầu quá thời gian' : 'Dữ liệu JSON không hợp lệ' }, e?.name === 'TimeoutError' ? 408 : 400);
    }
    if (reqBody.error) return reply({ error: reqBody.error }, reqBody.status);
    const body = reqBody.data;

    const targetLang = normalizeTargetLang(body?.targetLang);
    if (!targetLang) return reply({ error: 'Invalid targetLang' }, 400);
    const parsedUrl = parseDirectMp3Url(body?.url);
    if (!parsedUrl) return reply({ error: 'Chỉ hỗ trợ link MP3 HTTPS trực tiếp từ ieltsextremes.com (không chứa cổng lạ hoặc thông tin đăng nhập)' }, 400);

    let remote;
    try {
      remote = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      const msg = e?.name === 'TimeoutError' ? 'Tải link MP3 quá thời gian' : 'Không kết nối được tới ieltsextremes.com';
      return reply({ error: msg }, 502);
    }

    if (remote.status !== 200) {
      await remote.body?.cancel?.().catch(() => {});
      const isRedirect = remote.status >= 300 && remote.status < 400;
      return reply({ error: isRedirect ? 'Link chuyển hướng không được hỗ trợ; hãy dùng link MP3 trực tiếp' : `Nguồn trả về HTTP ${remote.status}` }, 422);
    }

    let readResult;
    try {
      readResult = await readBoundedMp3(remote);
    } catch (e) {
      const msg = e?.name === 'TimeoutError' ? 'Tải file MP3 quá thời gian' : 'Không đọc được dữ liệu từ link MP3';
      return reply({ error: msg }, 502);
    }
    if (readResult.error) return reply({ error: readResult.error }, readResult.status);

    const bytes = readResult.bytes;
    if (!isMp3Bytes(bytes)) return reply({ error: 'Link không trả về file MP3 hợp lệ' }, 422);

    const audioId = randomUUID();
    const name = sanitizeAudioName(parsedUrl.pathname);
    const audio = { id: audioId, name, type: 'audio/mpeg', size: bytes.length, playbackOnly: true, sourceHost: ALLOWED_HOST };
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    fs.writeFileSync(path.join(AUDIO_DIR, `${owner}-${audioId}.mp3`), bytes);

    const lesson = { audio, result: null, playbackOnly: true, targetLang };
    saveSession(owner, { listening: lesson, listeningTargetLang: targetLang });
    const latest = history(owner).find(x => x.lesson?.audio?.id === audioId);
    const res = reply({ audio, playbackOnly: true, historyId: latest?.id || null, targetLang }, 200);
    res.cookies.set('vocab_sid', owner, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 86400 });
    return res;
  } catch {
    return reply({ error: 'Nhập link MP3 thất bại' }, 400);
  } finally {
    inFlight.count = Math.max(0, inFlight.count - 1);
  }
}
