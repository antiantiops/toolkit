import { NextResponse, after } from 'next/server';
import { randomUUID } from 'crypto';
import { saveSession } from '../session/storage';
import { getUploadedFile } from '../upload/storage';
import { callJsonArray } from '../../../lib/vocabulary/ai';
import { runPipeline, progress } from '../../../lib/vocabulary/pipeline';

// ponytail: process-local jobs, single standalone server. Durable queue required before replicas/restart recovery.
const jobs = globalThis.vocabAnalysisJobs ||= new Map();
const TTL = 2 * 60 * 60 * 1000;
const cookie = { maxAge: 86400, path: '/', sameSite: 'lax', httpOnly: true };
function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
function schedule(job) {
  job.status = 'running';
  after(async () => {
    const item = getUploadedFile(job.imageId);
    if (!item) { job.status = 'failed'; job.error = 'Ảnh đã hết hạn trên server'; return; }
    const image = `data:${item.mime};base64,${item.buffer.toString('base64')}`;
    await runPipeline(job, { call: callJsonArray, image, persist: words => saveSession(job.owner, { words, preview: image }) });
    console.info('[vocab-job]', JSON.stringify({ jobId: job.id, status: job.status, ...progress(job) }));
  });
}
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return response({ error: 'Expected JSON { imageId } or { jobId, retry: true }' }, 400); }
  const owner = request.cookies.get('vocab_sid')?.value || randomUUID();
  for (const [id, job] of jobs) if (Date.now() - job.createdAt > TTL && job.status !== 'running') jobs.delete(id);
  let job;
  if (body.retry === true) {
    job = jobs.get(body.jobId);
    if (!job || job.owner !== owner) return response({ error: 'Tác vụ không tồn tại' }, 404);
    if (job.status !== 'running' && job.status !== 'completed') schedule(job);
  } else {
    if (typeof body.imageId !== 'string' || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(body.imageId)) return response({ error: 'Invalid imageId' }, 400);
    job = [...jobs.values()].find(j => j.owner === owner && j.imageId === body.imageId);
    if (!job) {
      if ([...jobs.values()].some(j => j.status === 'running')) return response({ error: 'AI đang xử lý bài khác. Thử lại khi bài đó hoàn tất.' }, 429);
      if (!getUploadedFile(body.imageId)) return response({ error: 'Ảnh không tồn tại hoặc hết hạn' }, 400);
      job = { id: randomUUID(), owner, imageId: body.imageId, status: 'running', stage: 'extract', createdAt: Date.now(), entries: [], words: [], batches: [] };
      jobs.set(job.id, job);
      schedule(job);
    }
  }
  const res = response({ jobId: job.id, status: job.status }, 202);
  res.cookies.set('vocab_sid', owner, cookie);
  return res;
}
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('jobId');
  const job = jobs.get(id);
  if (!job || job.owner !== request.cookies.get('vocab_sid')?.value) return response({ error: 'Tác vụ hết hạn hoặc server đã restart. Phân tích lại ảnh.' }, 404);
  return response({ jobId: id, requestId: id, status: job.status, stage: job.stage, elapsedMs: Date.now() - job.createdAt, progress: progress(job), words: job.words, error: job.error, failures: job.batches.filter(b => b.status === 'failed').map(b => ({ offset: b.offset, error: b.error })) });
}
