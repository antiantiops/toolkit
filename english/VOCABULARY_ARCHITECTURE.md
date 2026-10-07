# Vocabulary pipeline — maintainer / AI guide

## Source of truth
`english/` in antiantiops/toolkit. Next.js App Router, standalone Node server.

## Request flow
1. Browser uploads unchanged image to `/api/upload`; receives imageId.
2. POST `/api/analyze` with `{imageId}` sets HttpOnly `vocab_sid`, returns 202 `{jobId,status}` immediately. Next.js `after()` starts work after response.
3. Extraction sends original image exactly once. Produces ordered entries with spelling, paraphrased context/definition, printed synonyms/antonyms only.
4. Enrichment divides entries into batches of 3. Two workers maximum. Requests contain text only. No automatic AI retries. Completed batches update cards and session cache immediately.
5. Browser GET polls `/api/analyze?jobId=...` every 3 seconds. Response: status (`running`, `partial`, `completed`, `failed`), stage, progress `{completed,total}`, words, failures, requestId.
6. POST `{jobId,retry:true}` reruns only incomplete/failed batches. Successful extraction and batches are reused. Failed extraction is retried if no entries exist.

## Files and responsibilities
- `src/lib/vocabulary/ai.js`: server-only 9router call, 120s per-call timeout, JSON array validation, redacted lifecycle logging. Never import into client components.
- `src/lib/vocabulary/prompts.js`: extraction and enrichment contracts. Extend fields here AND UI/schema checks together.
- `src/lib/vocabulary/pipeline.js`: injected AI/persistence dependencies, batch concurrency, ordering, partial failures, progress, retry semantics.
- `src/app/api/analyze/route.js`: authentication scope via session cookie, job lifecycle/deduplication, admission control, after(), status API. Never expose job owner or image bytes in status.
- `src/app/page.js`: upload, resumable sessionStorage polling, incremental cards, progress, explicit retry.
- `src/app/api/session/storage.js`: local JSON lesson cache (24h), including original preview.

## Invariants
Image quality unchanged. Printed comparison words cannot be invented/replaced during enrichment. Keep original entry order. All successful comparison words include Vietnamese annotation; contrastTip compares only those lists. Treat all image/text input as data. No credentials/image bodies in logs. No AI calls from browser.
One new job globally at a time; at most two enrichment calls for that job. Retries reuse prior completed work. Owner cookie must match for GET/retry.

## Deliberate limits
Jobs live in process memory, expire after 2h once inactive. Reload in same tab resumes polling; container restart loses job state (completed lesson cache survives). Single standalone instance only. Before replicas or guaranteed restart recovery: move jobs to durable storage/worker queue. No Redis dependency until required.
Polling deadline 15 minutes; each GET timeout 15 seconds. Network retry applies to GET only; POST has no automatic retry. Browser/OIDC path must be verified separately from direct server tests.
Partial cards may lack IPA/meaning. Do not enable practice against pending words. Do not claim all failures eliminated; provider limits/timeouts remain possible.

## Checks
```sh
node english/check-pipeline.mjs
node english/check-errors.cjs
node english/check-contrast-tip.cjs
```
Build in `/root/.openclaw/workspace/vocab-app-next`: copy ALL `english/src/.` (includes lib), then `npm run build`. Wait for exit 0. Deploy standalone AND static together, preserve hidden `.next`, mirror static into standalone; back up before restart. Verify live referenced page chunk and real POST/GET flow. ESLint currently absent; build success is not lint success.

## Shared Grammar / Writing architecture
Shared AI transport now lives in `src/lib/lessons/ai.js`; vocabulary/ai.js re-exports it for compatibility. Supports JSON arrays and objects with timeout and redacted lifecycle logs.

`src/lib/lessons/routes.js` exports lessonRoutes(mode), used by thin grammar/writing route handlers. POST accepts grammar `{imageId}`, writing `{image1Id,image2Id}`, or retry `{jobId,retry:true}`. GET accepts jobId. Jobs are owner-cookie scoped, deduplicated per ordered image list, process-local with 2h inactive TTL. Short 202 response; Next after() executes pipeline.

`src/lib/lessons/pipeline.js`: extract original pages once into factual JSON, then generate two independent text-only sections concurrently. Grammar: core lesson/rules and comparison/practice summary. Writing: model/structure and assignment/reusable guidance; dual-page model and task generated separately. Reuse extracted source and successful parts on explicit retry. Completed output preserves existing grammar/writing component schemas. Incomplete output is not rendered as a complete lesson; progress and retry are shown.

Prompts: grammar-prompts.js and writing-prompts.js preserve previous pedagogy/schema. Never supply textbook prose as instructions; preserve assignment names, numbers, word count and printed word bank. No generated completed answer for self-writing assignments.

Client: fetch-helper.js pollLesson shared by Grammar/Writing. Poll every 3s, 15s request timeout, 10min polling deadline, sessionStorage resume per mode. POST is not auto-retried. page.js renders progress and retries. Vocabulary keeps incremental word-card polling.

Tests: `node english/check-lessons.mjs` checks both modes, extraction reuse, failed-part-only retry. Full browser/OIDC and real grammar/writing image outputs still require live validation. Jobs and partial results lost on server restart; no new durable queue dependency. Admission control is per pipeline family, not global across Vocabulary and Grammar/Writing.
