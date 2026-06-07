# OpenClaw Broken Changes

This document tracks breaking changes / issues encountered when upgrading OpenClaw, along with verified fixes.

---

## 2026.6.1 — Cron jobs "disappear" from the dashboard after upgrade

### Symptoms

- After updating OpenClaw to `2026.6.1`, the dashboard / `cron list` shows only **1 cron job** (usually `Memory Dreaming Promotion`, which the `memory-core` plugin recreates on its own).
- All previously configured cron jobs (e.g. `gold-world-monitor-v3`, `model-health-watchdog`, `daily-hunt-*`, `n8n-remote-auto-update`, ...) are no longer listed.
- `cron status` returns `jobs: 1`.

### Root cause

`2026.6.1` switched the cron storage backend **from JSON files to SQLite**:

- Old: `~/.openclaw/cron/jobs.json` + `~/.openclaw/cron/jobs-state.json`
- New: `~/.openclaw/state/openclaw.sqlite` (table `cron_jobs`, run logs in `cron_run_logs`)

Migrating the old data into SQLite **does NOT run automatically** during the update. As a result:

- The SQLite store starts empty → the scheduler only sees the job the plugin recreates.
- The old jobs are **still intact** inside `jobs.json`; they are simply no longer loaded.

> Important: **no data is lost.** It just has not been migrated yet.

### Fix (verified)

1. Back up first to be safe (reversible):

   ```bash
   ts=$(date +%Y%m%dT%H%M%SZ)
   cp -av ~/.openclaw/cron/jobs.json        ~/.openclaw/cron/jobs.json.premigrate-$ts
   cp -av ~/.openclaw/state/openclaw.sqlite ~/.openclaw/state/openclaw.sqlite.premigrate-$ts
   ```

2. Run doctor to complete the migration (imports the old JSON jobs + run logs into SQLite, and archives `jobs.json` -> `jobs.json.migrated`):

   ```bash
   openclaw doctor --fix --non-interactive
   ```

   Expected output includes a line like:

   ```
   Cron store migrated to SQLite at ~/.openclaw/cron/jobs.json. Imported N legacy cron run logs into SQLite.
   ```

3. Restart the gateway so the scheduler reloads from SQLite:

   - Via the control UI / runtime restart, or
   - `openclaw gateway restart`

4. Verify:

   ```bash
   openclaw cron status   # jobs: N (matches the old count)
   openclaw cron list
   ```

### Notes

- `doctor --fix` may warn something like *"N jobs set `payload.model` and will not inherit `agents.defaults.model`"*. This is **informational** only, not an error — the jobs still run with the model hardcoded in their payload.
- The old files are preserved after migration:
  - `~/.openclaw/cron/jobs.json.migrated` (archive created after migration)
  - `~/.openclaw/cron/jobs.json.premigrate-*` (manual backup if you followed step 1)

### Lesson / prevention for future upgrades

- After **every** OpenClaw upgrade, run `openclaw doctor --lint` (read-only) to detect any pending store migrations, then `openclaw doctor --fix` to complete them — **before** concluding that data was lost.
- Do not rush to recreate cron jobs by hand when they appear to be "missing" — most likely the new store simply hasn't been migrated yet.
