import { NextResponse, after } from 'next/server';
import { randomUUID } from 'crypto';
import { getUploadedFile } from '../../app/api/upload/storage';
import { saveSession } from '../../app/api/session/storage';
import { callJson } from './ai.js';
import { runLesson } from './pipeline.js';
const jobs = globalThis.lessonJobs ||= new Map();
const reply = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export function lessonRoutes(mode) {
  const schedule = job => {
    job.status = 'running';
    after(async () => {
      await runLesson(job, callJson);
      if (job.status === 'completed') saveSession(job.owner, { [mode]: job.result, ...mode === 'writing' ? { wPreview1: job.images[0], wPreview2: job.images[1] || null, modelDraft: null } : { gPreview: job.images[0] } });
    });
  };
  return {
    async POST(request) {
      let body;
      try { body = await request.json(); } catch { return reply({ error: 'Expected JSON' }, 400); }
      const owner = request.cookies.get('vocab_sid')?.value || randomUUID();
      for (const [id, j] of jobs) if (j.status !== 'running' && Date.now() - j.createdAt > 7200000) jobs.delete(id);
      let job;
      if (body.retry === true) {
        job = jobs.get(body.jobId);
        if (!job || job.owner !== owner || job.mode !== mode) return reply({ error: 'Job not found' }, 404);
        if (!['running','completed'].includes(job.status)) schedule(job);
      } else {
        const ids = mode === 'grammar' ? [body.imageId] : [body.image1Id, body.image2Id].filter(Boolean);
        if (!ids.length || ids.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(id))) return reply({ error: 'Invalid image IDs' }, 400);
        const key = JSON.stringify(ids);
        job = [...jobs.values()].find(j => j.owner === owner && j.mode === mode && j.key === key);
        if (!job) {
          if ([...jobs.values()].some(j => j.status === 'running')) return reply({ error: 'AI đang xử lý bài khác. Thử lại sau.' }, 429);
          const items = ids.map(getUploadedFile);
          if (items.some(x => !x)) return reply({ error: 'Ảnh hết hạn hoặc không tồn tại' }, 400);
          job = { id: randomUUID(), mode, owner, key, createdAt: Date.now(), status: 'running', stage: 'extract', result: {}, images: items.map(x => `data:${x.mime};base64,${x.buffer.toString('base64')}`) };
          jobs.set(job.id, job); schedule(job);
        }
      }
      const res = reply({ jobId: job.id, status: job.status }, 202);
      res.cookies.set('vocab_sid', owner, { maxAge: 86400, path: '/', sameSite: 'lax', httpOnly: true });
      return res;
    },
    async GET(request) {
      const job = jobs.get(new URL(request.url).searchParams.get('jobId'));
      if (!job || job.owner !== request.cookies.get('vocab_sid')?.value || job.mode !== mode) return reply({ error: 'Job hết hạn hoặc server đã restart' }, 404);
      return reply({ jobId: job.id, status: job.status, stage: job.stage, progress: { completed: (job.parts || []).filter(p => p.status === 'completed').length, total: 2 }, [mode]: job.status === 'completed' ? job.result : null, error: job.error || job.parts?.filter(p => p.status === 'failed').map(p => `Phần ${p.index + 1}: ${p.error}`).join('\n') });
    },
  };
}
