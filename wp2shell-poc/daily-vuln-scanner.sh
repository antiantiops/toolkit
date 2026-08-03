#!/usr/bin/env bash
#
# Daily Multi-Site Vulnerability Scanner with Telegram Notifications
# Uses Nuclei to scan multiple URLs and report NEW vulnerabilities only
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_LIST="${URL_LIST:-$SCRIPT_DIR/urls.txt}"
RESULTS_DIR="${RESULTS_DIR:-$SCRIPT_DIR/results}"
PREVIOUS_SCAN="${RESULTS_DIR}/previous.json"
CURRENT_SCAN="${RESULTS_DIR}/current.json"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# Send Telegram notification
send_telegram() {
    local message="$1"
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
        log "Telegram not configured, skipping notification"
        return 0
    fi
    
    curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=HTML" \
        -d "disable_web_page_preview=true" \
        >/dev/null 2>&1 || error "Failed to send Telegram notification"
}

# Check if Nuclei is available
check_nuclei() {
    if ! command -v nuclei >/dev/null 2>&1 && ! docker info >/dev/null 2>&1; then
        error "Neither nuclei binary nor Docker is available"
        error "Install nuclei: https://github.com/projectdiscovery/nuclei"
        exit 1
    fi
}

# Run Nuclei scan
run_nuclei() {
    local url="$1"
    local output_file="$2"
    
    log "Scanning $url..."
    
    if command -v nuclei >/dev/null 2>&1; then
        # Use local nuclei binary
        nuclei -u "$url" \
            -silent \
            -json \
            -severity critical,high,medium \
            -output "$output_file" \
            2>/dev/null || true
    else
        # Use Docker
        docker run --rm \
            -v "$RESULTS_DIR:/results" \
            projectdiscovery/nuclei:latest \
            -u "$url" \
            -silent \
            -json \
            -severity critical,high,medium \
            -output "/results/$(basename "$output_file")" \
            2>/dev/null || true
    fi
}

# Compare scans and find new vulnerabilities
find_new_vulns() {
    if [ ! -f "$PREVIOUS_SCAN" ]; then
        log "No previous scan found, all findings are new"
        cp "$CURRENT_SCAN" "$PREVIOUS_SCAN"
        return 0
    fi
    
    # Extract unique vulnerability signatures from both scans
    # Signature = host + template-id + matched-at
    local prev_sigs="/tmp/prev_sigs_$$.txt"
    local curr_sigs="/tmp/curr_sigs_$$.txt"
    local new_sigs="/tmp/new_sigs_$$.txt"
    
    jq -r '[.host, .["template-id"], .["matched-at"]] | @csv' "$PREVIOUS_SCAN" 2>/dev/null | sort -u > "$prev_sigs" || touch "$prev_sigs"
    jq -r '[.host, .["template-id"], .["matched-at"]] | @csv' "$CURRENT_SCAN" 2>/dev/null | sort -u > "$curr_sigs" || touch "$curr_sigs"
    
    # Find signatures present in current but not in previous
    comm -13 "$prev_sigs" "$curr_sigs" > "$new_sigs"
    
    local new_count
    new_count=$(wc -l < "$new_sigs")
    
    rm -f "$prev_sigs" "$curr_sigs" "$new_sigs"
    
    echo "$new_count"
}

# Generate summary report
generate_report() {
    local total_vulns
    local critical high medium
    
    if [ ! -f "$CURRENT_SCAN" ] || [ ! -s "$CURRENT_SCAN" ]; then
        log "No vulnerabilities found in current scan"
        return 0
    fi
    
    total_vulns=$(jq -s 'length' "$CURRENT_SCAN" 2>/dev/null || echo 0)
    critical=$(jq -s '[.[] | select(.severity=="critical")] | length' "$CURRENT_SCAN" 2>/dev/null || echo 0)
    high=$(jq -s '[.[] | select(.severity=="high")] | length' "$CURRENT_SCAN" 2>/dev/null || echo 0)
    medium=$(jq -s '[.[] | select(.severity=="medium")] | length' "$CURRENT_SCAN" 2>/dev/null || echo 0)
    
    cat <<EOF

====================================================================
                    VULNERABILITY SCAN REPORT
====================================================================
Date: $(date +'%Y-%m-%d %H:%M:%S %Z')

Total Vulnerabilities: $total_vulns
  🔴 Critical: $critical
  🟠 High: $high
  🟡 Medium: $medium

EOF

    if [ "$total_vulns" -gt 0 ]; then
        echo "Top Findings:"
        jq -r '.[] | "  [\(.severity | ascii_upcase)] \(.info.name) - \(.host)"' "$CURRENT_SCAN" 2>/dev/null | head -10
    fi
    
    echo "===================================================================="
}

# Send new vulnerabilities notification
notify_new_vulns() {
    local new_count="$1"
    
    if [ "$new_count" -eq 0 ]; then
        log "No new vulnerabilities detected"
        return 0
    fi
    
    log "Found $new_count new vulnerabilities"
    
    # Build Telegram message
    local message="🚨 <b>New Vulnerabilities Detected</b> 🚨\n\n"
    message+="Date: $(date +'%Y-%m-%d %H:%M:%S')\n"
    message+="New findings: <b>$new_count</b>\n\n"
    
    # Add top 5 new vulnerabilities
    local top_vulns
    top_vulns=$(jq -r '.[] | "[\(.severity | ascii_upcase)] \(.info.name)\n  Host: \(.host)\n  Matched: \(.["matched-at"])\n"' "$CURRENT_SCAN" 2>/dev/null | head -20 || echo "")
    
    if [ -n "$top_vulns" ]; then
        message+="<b>Top Findings:</b>\n"
        message+="<pre>$top_vulns</pre>"
    fi
    
    send_telegram "$message"
}

# Main function
main() {
    log "Starting daily vulnerability scan"
    
    # Check prerequisites
    check_nuclei
    
    if [ ! -f "$URL_LIST" ]; then
        error "URL list not found: $URL_LIST"
        error "Create a file with one URL per line"
        exit 1
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Backup previous scan
    if [ -f "$CURRENT_SCAN" ]; then
        mv "$CURRENT_SCAN" "$PREVIOUS_SCAN"
    fi
    
    # Scan all URLs
    local temp_results="/tmp/nuclei_scan_$$.jsonl"
    > "$temp_results"
    
    local url_count=0
    while IFS= read -r url || [ -n "$url" ]; do
        # Skip empty lines and comments
        [[ -z "$url" || "$url" =~ ^[[:space:]]*# ]] && continue
        
        ((url_count++))
        
        local temp_file="/tmp/nuclei_${url_count}_$$.json"
        run_nuclei "$url" "$temp_file"
        
        # Append results
        if [ -f "$temp_file" ]; then
            cat "$temp_file" >> "$temp_results"
            rm -f "$temp_file"
        fi
    done < "$URL_LIST"
    
    log "Scanned $url_count URLs"
    
    # Convert JSONL to JSON array
    if [ -s "$temp_results" ]; then
        jq -s '.' "$temp_results" > "$CURRENT_SCAN"
    else
        echo "[]" > "$CURRENT_SCAN"
    fi
    rm -f "$temp_results"
    
    # Find new vulnerabilities
    local new_count
    new_count=$(find_new_vulns)
    
    # Generate report
    generate_report
    
    # Send notifications for new vulnerabilities
    notify_new_vulns "$new_count"
    
    success "Scan completed"
}

# Run main
main "$@"
