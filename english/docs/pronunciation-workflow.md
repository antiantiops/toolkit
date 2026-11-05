# Pronunciation assessment

Single Node instance. `POST /api/pronunciation-assess` accepts validated mono PCM16 WAV and a target word. Quiet audio is rejected before inference. Uploads are saved under `CACHE_DIR/pronunciation-jobs` with owner-bound SHA256 IDs; identical account/word/audio reuses one job and result. POST returns 202 without waiting for Gemini. `after()` processes jobs, at most four concurrently, with two bounded 110-second attempts. Model remains `ag/gemini-3.8-flash-high`.

`GET ?jobId=...` returns queued/running/retrying/completed/failed with attempt and result/error, only for the authenticated owner. WAV and metadata/result survive restart on the mounted cache. Pending work does not automatically resume after restart: GET marks interrupted work failed; explicit JSON POST `{jobId,retry:true}` reprocesses the saved WAV. Completed work is reused. Files expire after 24 hours; cleanup occurs on new valid uploads. This is not a multi-replica durable worker queue.

Client uses 20-second upload/status requests, polls every three seconds, and reconnects on transient GET failure without resending audio. Same-tab sessionStorage retains IDs keyed by word, supporting popup reopen and reload recovery. It does not retain the local playback Blob after unmount. Account ownership is always checked server-side. Polling stops after six minutes with a resume action; server work is independent of browser cancellation. Final failures allow retrying saved audio without rerecording. Yellow notices distinguish waiting/reconnecting from terminal errors.

Checks:
- `node checks/pronunciation-recorder.mjs`: WAV encoding and source contracts.
- `node checks/pronunciation-jobs.mjs`: injected inference; acknowledgement, dedupe, silence, ownership, bounded failure/retry and restart handling.
- `node checks/pronunciation-jobs-browser.mjs`: localhost:3099, fake microphone and mocked jobs; failed status request recovers, popup reopening retrieves result without another POST, desktop/mobile.
- Live authenticated container probe, synthetic TTS saying “Progress”: 202 in 202 ms, duplicate upload same ID, real Gemini completed in 15.3 seconds on first attempt. This proves transport/job flow, not pronunciation accuracy or mobile OIDC behavior.
