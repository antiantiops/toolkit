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
