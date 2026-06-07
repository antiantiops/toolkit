# OpenClaw Broken Changes

Tài liệu này ghi lại các breaking change / lỗi gặp phải khi nâng cấp OpenClaw, kèm cách khắc phục đã verify trên thực tế.

---

## 2026.6.1 — Cron jobs "biến mất" khỏi dashboard sau khi upgrade

### Triệu chứng

- Sau khi update OpenClaw lên `2026.6.1`, dashboard / `cron list` chỉ còn **1 cron job** (thường là `Memory Dreaming Promotion` do plugin `memory-core` tự tạo lại).
- Các cron job cũ (ví dụ: `gold-world-monitor-v3`, `model-health-watchdog`, `daily-hunt-*`, `n8n-remote-auto-update`, ...) không còn hiển thị.
- `cron status` trả về `jobs: 1`.

### Nguyên nhân gốc (root cause)

`2026.6.1` đổi backend lưu trữ cron **từ file JSON sang SQLite**:

- Cũ: `~/.openclaw/cron/jobs.json` + `~/.openclaw/cron/jobs-state.json`
- Mới: `~/.openclaw/state/openclaw.sqlite` (table `cron_jobs`, run logs ở `cron_run_logs`)

Việc migrate dữ liệu cũ sang SQLite **KHÔNG tự động chạy** khi update. Vì vậy:

- SQLite store khởi tạo rỗng → scheduler chỉ thấy job được plugin tự tạo lại.
- Các job cũ **vẫn còn nguyên** trong `jobs.json`, chỉ là không được load nữa.

> Quan trọng: **dữ liệu không bị mất.** Nó chỉ chưa được migrate.

### Cách khắc phục (đã verify)

1. Backup trước cho an toàn (reversible):

   ```bash
   ts=$(date +%Y%m%dT%H%M%SZ)
   cp -av ~/.openclaw/cron/jobs.json        ~/.openclaw/cron/jobs.json.premigrate-$ts
   cp -av ~/.openclaw/state/openclaw.sqlite ~/.openclaw/state/openclaw.sqlite.premigrate-$ts
   ```

2. Chạy doctor để hoàn tất migration (import job + run log JSON cũ vào SQLite, đồng thời archive `jobs.json` -> `jobs.json.migrated`):

   ```bash
   openclaw doctor --fix --non-interactive
   ```

   Output mong đợi sẽ có dòng dạng:

   ```
   Cron store migrated to SQLite at ~/.openclaw/cron/jobs.json. Imported N legacy cron run logs into SQLite.
   ```

3. Restart gateway để scheduler reload từ SQLite:

   - Qua control UI / runtime restart, hoặc
   - `openclaw gateway restart`

4. Verify:

   ```bash
   openclaw cron status   # jobs: N (đủ số cũ)
   openclaw cron list
   ```

### Lưu ý

- `doctor --fix` có thể cảnh báo kiểu *"N jobs set `payload.model` and will not inherit `agents.defaults.model`"*. Đây chỉ là **thông tin**, không phải lỗi — job vẫn chạy đúng model đã đặt cứng trong payload.
- File cũ được giữ lại sau migration:
  - `~/.openclaw/cron/jobs.json.migrated` (bản archive sau khi migrate)
  - `~/.openclaw/cron/jobs.json.premigrate-*` (backup thủ công nếu làm theo bước 1)

### Bài học / phòng ngừa cho lần update sau

- Sau **mỗi** lần nâng cấp OpenClaw, chạy `openclaw doctor --lint` (read-only) để phát hiện các migration store còn dang dở, rồi `openclaw doctor --fix` để hoàn tất — **trước khi** kết luận là mất dữ liệu.
- Đừng vội tạo lại cron bằng tay khi thấy "mất" — nhiều khả năng chỉ là store mới chưa migrate.
