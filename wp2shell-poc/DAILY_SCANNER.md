# Daily Vulnerability Scanner

Tự động scan nhiều URLs hàng ngày và chỉ thông báo **lỗ hổng mới** qua Telegram.

## Tính năng

- ✅ Scan nhiều URLs từ file list
- ✅ Dùng Nuclei với 9,000+ CVE templates
- ✅ So sánh với scan ngày hôm trước
- ✅ **Chỉ thông báo khi có lỗ hổng MỚI xuất hiện**
- ✅ Telegram notifications với summary
- ✅ JSON output để tracking lịch sử

## Cài đặt

### 1. Cài Nuclei

**Option A: Docker (recommended)**
```bash
docker pull projectdiscovery/nuclei:latest
```

**Option B: Binary**
```bash
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

### 2. Cấu hình

**Tạo file `urls.txt`:**
```bash
cp urls.txt urls.txt.production
nano urls.txt.production
```

Thêm các URLs cần scan (một URL mỗi dòng):
```
https://nimtechnology.com
https://example.com
https://another-site.com
```

**Cấu hình Telegram (optional nhưng recommended):**
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

Hoặc tạo file `.env`:
```bash
cat > .env <<EOF
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=1060934751
EOF
```

### 3. Test chạy thử

```bash
chmod +x daily-vuln-scanner.sh

# Test với URLs mẫu
./daily-vuln-scanner.sh

# Test với URLs production
URL_LIST=urls.txt.production ./daily-vuln-scanner.sh
```

## Cài đặt Cron để chạy hàng ngày

**Option 1: Cron trên host**
```bash
# Chạy lúc 2h sáng mỗi ngày
crontab -e
```

Thêm dòng:
```
0 2 * * * cd /path/to/toolkit/wp2shell-poc && source .env 2>/dev/null; ./daily-vuln-scanner.sh >> /var/log/vuln-scanner.log 2>&1
```

**Option 2: Docker Compose với cron**
```yaml
version: '3.8'
services:
  vuln-scanner:
    image: projectdiscovery/nuclei:latest
    volumes:
      - ./daily-vuln-scanner.sh:/scanner.sh
      - ./urls.txt:/urls.txt
      - ./results:/results
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
    command: |
      sh -c "
        while true; do
          /scanner.sh
          sleep 86400  # 24 hours
        done
      "
```

**Option 3: Systemd Timer (recommended cho production)**
```bash
# /etc/systemd/system/vuln-scanner.service
[Unit]
Description=Daily Vulnerability Scanner
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=openclaw
WorkingDirectory=/home/openclaw/toolkit/wp2shell-poc
EnvironmentFile=/home/openclaw/toolkit/wp2shell-poc/.env
ExecStart=/home/openclaw/toolkit/wp2shell-poc/daily-vuln-scanner.sh
StandardOutput=append:/var/log/vuln-scanner.log
StandardError=append:/var/log/vuln-scanner.log

# /etc/systemd/system/vuln-scanner.timer
[Unit]
Description=Run vulnerability scanner daily
Requires=vuln-scanner.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vuln-scanner.timer
sudo systemctl start vuln-scanner.timer
sudo systemctl status vuln-scanner.timer
```

## Cách hoạt động

1. **Scan đầu tiên:** Tất cả findings đều được coi là "mới", lưu baseline vào `results/previous.json`
2. **Scan tiếp theo:** So sánh với baseline, chỉ thông báo findings chưa có trong scan trước
3. **Telegram notification:** Chỉ gửi khi phát hiện lỗ hổng mới (không spam khi không có gì mới)

## Output

**Console:**
```
[2026-08-03 14:00:00] Starting daily vulnerability scan
[2026-08-03 14:00:05] Scanning https://nimtechnology.com...
[2026-08-03 14:00:20] Scanning https://example.com...
[2026-08-03 14:00:35] Scanned 2 URLs

====================================================================
                    VULNERABILITY SCAN REPORT
====================================================================
Date: 2026-08-03 14:00:40 UTC

Total Vulnerabilities: 3
  🔴 Critical: 1
  🟠 High: 2
  🟡 Medium: 0

Top Findings:
  [CRITICAL] WordPress wp2shell RCE - https://nimtechnology.com
  [HIGH] XML-RPC Enabled - https://example.com
====================================================================

[2026-08-03 14:00:40] Found 3 new vulnerabilities
[SUCCESS] Scan completed
```

**Telegram:**
```
🚨 New Vulnerabilities Detected 🚨

Date: 2026-08-03 14:00:40
New findings: 3

Top Findings:
[CRITICAL] WordPress wp2shell RCE
  Host: https://nimtechnology.com
  Matched: /wp-json/batch/v1

[HIGH] XML-RPC Enabled
  Host: https://example.com
  Matched: /xmlrpc.php
```

## Files Structure

```
wp2shell-poc/
├── daily-vuln-scanner.sh    # Main scanner script
├── urls.txt                  # URL list template
├── urls.txt.production       # Your actual URLs (gitignored)
├── .env                      # Telegram credentials (gitignored)
└── results/
    ├── current.json          # Latest scan results
    └── previous.json         # Previous scan for comparison
```

## Troubleshooting

**"Neither nuclei binary nor Docker is available"**
- Install Nuclei hoặc Docker

**"No new vulnerabilities detected" nhưng biết chắc có lỗ hổng**
- Xóa `results/previous.json` để reset baseline
- Hoặc check `results/current.json` để xem raw findings

**Không nhận được Telegram notification**
- Verify `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`
- Test thủ công: `curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d "chat_id=<CHAT_ID>" -d "text=test"`

## Advanced Usage

**Scan với severity filters:**
```bash
# Chỉ báo Critical và High
# (đã set mặc định trong script)
```

**Scan specific CVE templates:**
```bash
# Modify script: thêm -t cves/2026/ để chỉ scan CVE năm 2026
```

**Custom notification format:**
- Edit hàm `notify_new_vulns()` trong script

## Security Notes

- ⚠️ Không commit `urls.txt.production` hoặc `.env` vào git
- ⚠️ Results chứa thông tin nhạy cảm về infrastructure, bảo mật file permissions
- ⚠️ Chỉ scan các site bạn sở hữu hoặc có authorization

## References

- [Nuclei GitHub](https://github.com/projectdiscovery/nuclei)
- [Nuclei Templates](https://github.com/projectdiscovery/nuclei-templates)
- [Telegram Bot API](https://core.telegram.org/bots/api)
