# Storage and deployment safety

## Current deployment and gap

Host: `192.168.101.36`; container: `vocab-learner`; HTTP: `8085`.
Verified mounts are bind mounts, not Docker named volumes:

| Host | Container | Current mode |
| --- | --- | --- |
| `/home/docker/vocab-learner/.next/standalone` | `/app` | RW |
| `/home/docker/vocab-learner/.next/static` | `/app/.next/static` | RW |
| `/home/docker/vocab-learner/public` | `/app/public` | RW |
| `/home/docker/vocab-learner/data` | `/data` | RW |

Production migration completed: `WORDS_DB_PATH=/data/words.sqlite`.
The upload staging bind is `/home/docker/vocab-learner/data/uploads` to
`/tmp/vocab_uploads` RW. All five explicit storage variables below are set.
All 8 database tables were compared by full-content hashes across cutover.
Old stopped container: `vocab-learner-before-storage-20261109`.
Migration snapshot: `/home/docker/vocab-backups/storage-migration-20261109T225610Z`.

## Storage inventory and retention

- `words.sqlite`: words, review flags, week membership/order/counters,
  `game_memory`, chat extraction preferences/jobs/context, `speech_segments`.
  Durable account data; never expire or clean as cache.
- `/data/lookup.sqlite`: lookup enrichment cache; entries expire after 7 days.
- `/data/cache`: mixed storage, NOT disposable wholesale. Contains saved
  lesson sessions (24-hour TTL), Listening history (7-day window), Writing
  prompt preferences and feature-notice claims (durable), chat jobs, pronunciation
  jobs/audio (24-hour TTL), and generated Listening audio cache.
- `/data/listening-audio`: uploaded original Listening audio; cleanup after
  7 days by application policy. Mount does not disable expiry.
- `/data/spotify`: account ownership markers, downloaded tracks, transcripts,
  request/state files and audio variants; preserve together. External worker
  mounts must reference the same host tree; inspect worker configuration before
  changing this path.
- `/tmp/vocab_uploads`: uploaded image staging, currently inside container
  writable layer, with 2-hour cleanup. Survives a restart but NOT container
  recreation. Preserve pending uploads through the dedicated mount below.
- In-memory `Map` jobs (image analysis, lesson generation and audio analysis):
  lost on process restart. Completed saved data is separate. Drain active work
  before deployment; mounting a directory does not persist RAM.
- Browser-only state is not covered by host backup.

## Target layout: reuse existing data bind mount

Keep `/home/docker/vocab-learner/data:/data` RW and set explicitly:

```text
WORDS_DB_PATH=/data/words.sqlite
LOOKUP_DB_PATH=/data/lookup.sqlite
CACHE_DIR=/data/cache
LISTENING_AUDIO_DIR=/data/listening-audio
SPOTIFY_CACHE_DIR=/data/spotify
```

Add bind mount:

```text
/home/docker/vocab-learner/data/uploads:/tmp/vocab_uploads
```

This preserves the existing upload code and its deliberate 2-hour expiry.
No new dependency or source rebuild is needed. Keep existing app/static/public
mounts initially. Consider read-only build mounts only after testing Next.js
runtime cache writes; do not change their permissions blindly.

Do not use `/app/data` as a second active DB location. Keep the old DB offline
for rollback only. Do not add mount aliases that hide divergent copies.

## Approved migration procedure

Container has no Compose labels; find the actual launcher/manager first.
Export `docker inspect` to a root-only file on the host (contains credentials),
then preserve image ID, entrypoint, command, user, ports, network, restart policy,
resources, environment and every existing mount. Do not print secret values.
Update the real launcher rather than inventing a partial `docker run` command.

1. Obtain approval for exact recreation/config change, downtime and rollback.
2. Snapshot table counts, per-owner/per-week counts and current build ID.
   Record all tables, not only `words`. Drain active jobs and stop container
   to prevent writes while switching paths.
3. Use Python `sqlite3.Connection.backup()` or SQLite `.backup` to produce a
   consistent snapshot of the old database, including committed WAL contents.
   Verify `PRAGMA integrity_check`; never copy a live DB file alone.
4. Refuse to overwrite an existing `/data/words.sqlite` without inspecting and
   reconciling it. Publish a verified snapshot there. Preserve original DB,
   launcher config and rollback snapshot outside the build tree.
5. Copy current image staging files to `data/uploads` while stopped, preserving
   timestamps. Add the upload bind and explicit paths above in the launcher.
6. Recreate container using the SAME build/image and preserved settings. Do not
   combine migration with a feature deployment. Restart alone cannot change env
   or mounts.
7. Verify active environment, mount coverage, table content and counts, weekly
   memberships, game memory, review flags, account isolation and authenticated
   save/list. Verify referenced JS assets as well as HTTP health.
8. Restart once and confirm a scoped test write persists; remove only that test
   fixture. Verify no new writes reach the old `/app/data` database.

Rollback: stop writes, snapshot the new DB, and restore previous launcher and
mounts. If writes occurred after cutover, reconcile them before using the old
DB; blindly switching back would lose those writes.

## Every deployment gate

- Run `python3 checks/storage-contract.py <root-only-docker-inspect.json>` on
  the host. Failure blocks release; current un-migrated deployment must fail.
- Back up SQLite with its backup API and verify integrity. Capture counts for
  all tables and owner/week summaries. Include `lookup.sqlite` if needed.
- Snapshot the complete `/data` tree after quiescing writers; it contains
  durable preferences as well as caches. Backups belong OUTSIDE build/data
  trees, e.g. `/home/docker/vocab-backups/<UTC timestamp>/`, mode 0700.
- Exclude `data/` and SQLite files from build archives. Inspect archive entries
  before extracting. Never delete or rsync `--delete` a data mount.
- Deploy both standalone and static artifacts; mirror static into standalone
  when required by this deployment. Runtime data must not be in either artifact.
- Compare table content/counts and account/week membership before and after;
  unexplained drops block completion. HTTP 200 is not a data check.
- Verify active build ID, referenced client assets, authenticated UI and save/list.
  Report any untested browser step explicitly.

## Backup policy

Before every deploy: consistent DB snapshots plus quiesced full `/data` backup.
Proposed scheduled policy: daily backup, 14 daily and 8 weekly generations,
plus encrypted off-host copy. Retention deletion requires a separate reviewed
policy; do not prune incident recovery artifacts automatically. Test restore
into an isolated directory and compare data, never restore over production as
an exercise. Installed host service `vocab-backup.service` and timer `vocab-backup.timer`: daily
04:15 UTC, persistent timer. Script `/usr/local/sbin/vocab-backup.py` uses flock,
stops app and Spotify worker (up to 60 seconds each to drain), snapshots both DBs
and the complete data tree, then restarts only previously-running services in
finally. Expect a short maintenance window each backup. Source: `checks/backup-data.py`.
Retention deletion is not enabled; all generations are kept pending restore and
off-host verification. Off-host encrypted backup remains pending; no unverified
cloud destination or encryption recovery key is assumed.

## Recovery rules

Choose the newest verified backup by actual database contents and timestamps,
not directory name. Check all accounts and current weeks. Merge on natural keys
`(owner, english)` and remap word IDs before restoring week links. Preserve
post-backup writes. Counters/review flags/game debt need explicit conflict rules;
row counts alone cannot establish complete recovery. Obtain approval before
production merge. State the backup cutoff and any unrecoverable interval.

## Verified cutover acceptance

- Full-content hashes of all 8 tables matched before/after migration.
- 700 words, 726 week links, 151 game records; affected account retains 37
  words for week `2026-11-09`.
- DB and upload scoped writes survived restart; test fixtures removed.
- Old DB content stayed unchanged after cutover and restart.
- Authenticated My Words and game-memory reads returned 200 through the
  inspected container listener; unauthenticated My Words returned 401.
  Real browser OAuth/UI interaction remains untested.
- First scheduled-service test exited 0, produced DB snapshots, full archive
  and SHA256SUMS. Isolated restore of migration archive passed integrity and
  word-count checks. Backup pause measured about 77 seconds, dominated by
  worker drain; reserve a maintenance window.
- Protected current Docker config: `/home/docker/vocab-learner/deployment/container.json`.
  Contains secrets: root-only; never commit or print. Previous config stored
  alongside it and in migration snapshot. Container was originally unmanaged
  (no Compose labels); recreation used original Config/HostConfig and immutable
  image ID via local Docker API, changing only storage environment/bind.
- Build is unchanged; no feature release was bundled with migration.
- Off-host transport is not installed on host. An existing `gdrive` config was
  discovered, but destination ownership and encryption recovery-key custody
  are not verified. Obtain destination and key-custody decision before upload;
  do not copy user data to an assumed cloud folder.
