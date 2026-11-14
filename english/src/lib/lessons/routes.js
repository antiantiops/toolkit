import {lessonSpeech} from '../speech-segments.mjs';
import {saveSpeech} from '../speech-store';
import { cacheOwner } from '../../app/api/session/owner';
import { NextResponse, after } from 'next/server';
import { randomUUID } from 'crypto';
import { getUploadedFile } from '../../app/api/upload/storage';
import { saveSession } from '../../app/api/session/storage';
import { callJson } from './ai.js';
import { runLesson } from './pipeline.js';
import { normalizeTargetLang, DEFAULT_LANGUAGE } from './language.mjs';
const jobs = globalThis.lessonJobs ||= new Map();
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export function lessonRoutes(mode) {
  const schedule = job => {
    job.status = 'running';
    after(async () => {
      await runLesson(job, callJson);
      if (job.status === 'completed') for(const entry of lessonSpeech(job.result)) {try{saveSpeech(job.owner,entry.text,entry.segments);}catch{console.error('[speech-cache] write failed');}}
      if (job.status === 'completed') {
        const sessionPayload = {
          [mode]: job.result,
          [`${mode}TargetLang`]: job.targetLang || DEFAULT_LANGUAGE,
          ...mode === 'writing'
            ? { wPreview1: job.images[0], wPreview2: job.images[1] || null, modelDraft: null, modelDraftTargetLang: job.targetLang || DEFAULT_LANGUAGE }
            : { gPreview: job.images[0] }
        };
        saveSession(job.owner, sessionPayload);
      }
    });
  };
  return {
    async POST(request) {
      if (!cacheOwner(request)) return reply({error:"Cần đăng nhập qua Kong"},401);
      let body;
      try { body = await request.json(); } catch { return reply({ error: 'Expected JSON' }, 400); }
      const owner = cacheOwner(request);
      for (const [id, j] of jobs) if (j.status !== 'running' && Date.now() - j.createdAt > 7200000) jobs.delete(id);
      let job;
      if (body.retry === true) {
        job = jobs.get(body.jobId);
        if (!job || job.owner !== owner || job.mode !== mode) return reply({ error: 'Job not found' }, 404);
        if (body.targetLang !== undefined) {
          const requestedLang = normalizeTargetLang(body.targetLang);
          if (!requestedLang || requestedLang !== (job.targetLang || DEFAULT_LANGUAGE)) {
            return reply({ error: 'Invalid or differing targetLang for retry' }, 400);
          }
        }
        if (!['running','completed'].includes(job.status)) schedule(job);
      } else {
        const targetLang = normalizeTargetLang(body.targetLang);
        if (!targetLang) return reply({ error: 'Invalid targetLang' }, 400);
        const ids = mode === 'grammar' ? [body.imageId] : [body.image1Id, body.image2Id].filter(Boolean);
        if (!ids.length || ids.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(id))) return reply({ error: 'Invalid image IDs' }, 400);
        const key = targetLang === DEFAULT_LANGUAGE ? JSON.stringify(ids) : JSON.stringify({ ids, targetLang });
        job = [...jobs.values()].find(j => j.owner === owner && j.mode === mode && j.key === key);
        if (!job) {
          if ([...jobs.values()].some(j => j.status === 'running')) return reply({ error: 'AI đang xử lý bài khác. Thử lại sau.' }, 429);
          const items = ids.map(getUploadedFile);
          if (items.some(x => !x)) return reply({ error: 'Ảnh hết hạn hoặc không tồn tại' }, 400);
          job = { id: randomUUID(), mode, owner, key, targetLang, createdAt: Date.now(), status: 'running', stage: 'extract', result: {}, images: items.map(x => `data:${x.mime};base64,${x.buffer.toString('base64')}`) };
          jobs.set(job.id, job); schedule(job);
        }
      }
      const res = reply({ jobId: job.id, status: job.status }, 202);
      res.cookies.set('vocab_sid', owner, { maxAge: 86400, path: '/', sameSite: 'lax', httpOnly: true });
      return res;
    },
    async GET(request) {
      if (!cacheOwner(request)) return reply({error:"Cần đăng nhập qua Kong"},401);
      const job = jobs.get(new URL(request.url).searchParams.get('jobId'));
      if (!job || job.owner !== cacheOwner(request) || job.mode !== mode) return reply({ error: 'Job hết hạn hoặc server đã restart' }, 404);
      return reply({ jobId: job.id, status: job.status, stage: job.stage, progress: { completed: (job.parts || []).filter(p => p.status === 'completed').length, total: job.parts?.length || 0 }, ...(mode === 'writing' ? { source: job.source || null, parts: (job.parts || []).map(p => ({index:p.index, fields:p.fields, status:p.status})), elapsedMs: Date.now() - job.createdAt } : {}), [mode]: job.status === 'completed' || (mode === 'writing' && Object.keys(job.result).length) ? job.result : null, error: job.error || job.parts?.filter(p => p.status === 'failed').map(p => `Phần ${p.index + 1}: ${p.error}`).join('\n') });
    },
  };
}
