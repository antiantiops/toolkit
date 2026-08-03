#!/usr/bin/env bash
#
# wp2shell Hardening Verification Tool
# CVE-2026-63030 + CVE-2026-60137
#
# ETHICAL USE ONLY - Test systems you own or have authorization to test.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "======================================================================"
    echo "  wp2shell Hardening Verification Tool"
    echo "  CVE-2026-63030 + CVE-2026-60137"
    echo "======================================================================"
    echo -e "${NC}"
    echo -e "${YELLOW}[!] ETHICAL USE ONLY - Test your own systems${NC}\n"
}

check_version() {
    local target="$1"
    local verbose="$2"
    
    echo -e "${BLUE}[+] Checking WordPress version...${NC}"
    
    local response
    response=$(curl -sS --max-time 10 "$target" 2>/dev/null || true)
    
    local version
    version=$(echo "$response" | grep -oP '<meta name="generator" content="WordPress \K[0-9.]+' | head -1 || true)
    
    if [ -z "$version" ]; then
        echo -e "${YELLOW}[i] Could not detect WordPress version${NC}"
        return 1
    fi
    
    echo -e "${CYAN}[i] WordPress $version detected${NC}"
    
    # Check if vulnerable
    local is_vulnerable=0
    if [[ "$version" =~ ^6\.9\.[0-4]$ ]] || [[ "$version" =~ ^7\.0\.[0-1]$ ]]; then
        is_vulnerable=1
        echo -e "${RED}[✗] Version IS vulnerable to wp2shell${NC}"
        return 1
    else
        echo -e "${GREEN}[✓] Version is NOT vulnerable (patched or not affected)${NC}"
        return 0
    fi
}

check_endpoint() {
    local url="$1"
    local name="$2"
    local verbose="$3"
    
    local status
    status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$verbose" = "true" ]; then
        echo -e "${CYAN}[i] $name: HTTP $status${NC}"
    fi
    
    if [ "$status" = "403" ]; then
        echo -e "${GREEN}[✓] $name returns HTTP 403 (blocked)${NC}"
        return 0
    elif [ "$status" = "404" ]; then
        echo -e "${GREEN}[✓] $name returns HTTP 404 (endpoint removed)${NC}"
        return 0
    else
        echo -e "${RED}[✗] $name returns HTTP $status (NOT blocked)${NC}"
        return 1
    fi
}

check_batch_hardening() {
    local target="$1"
    local verbose="$2"
    
    echo -e "\n${BLUE}[+] Checking REST batch endpoint hardening...${NC}"
    
    local blocked=0
    
    # Check direct endpoint
    if check_endpoint "${target}/wp-json/batch/v1" "/wp-json/batch/v1" "$verbose"; then
        ((blocked++)) || true
    fi
    
    # Check query fallback
    if check_endpoint "${target}/?rest_route=/batch/v1" "?rest_route=/batch/v1" "$verbose"; then
        ((blocked++)) || true
    fi
    
    [ "$blocked" -eq 2 ] && return 0 || return 1
}

check_xmlrpc() {
    local target="$1"
    local verbose="$2"
    
    echo -e "\n${BLUE}[+] Checking XML-RPC hardening...${NC}"
    
    local status
    status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 -X POST "${target}/xmlrpc.php" 2>/dev/null || echo "000")
    
    if [ "$verbose" = "true" ]; then
        echo -e "${CYAN}[i] /xmlrpc.php: HTTP $status${NC}"
    fi
    
    if [ "$status" = "403" ] || [ "$status" = "404" ] || [ "$status" = "405" ]; then
        echo -e "${GREEN}[✓] /xmlrpc.php returns HTTP $status (blocked)${NC}"
        return 0
    else
        echo -e "${YELLOW}[!] /xmlrpc.php returns HTTP $status (accessible - consider blocking)${NC}"
        return 1
    fi
}

print_recommendations() {
    local version_ok="$1"
    local batch_ok="$2"
    local xmlrpc_ok="$3"
    
    echo -e "\n${BLUE}======================================================================${NC}"
    echo -e "${BOLD}Recommendations:${NC}\n"
    
    if [ "$version_ok" = "false" ]; then
        echo -e "${RED}[!] UPDATE REQUIRED:${NC}"
        echo "    - Update WordPress to 6.9.5+ or 7.0.2+"
        echo "    - Enable auto-updates: define('WP_AUTO_UPDATE_CORE', true);"
        echo ""
    fi
    
    if [ "$batch_ok" = "false" ]; then
        echo -e "${RED}[!] BLOCK REST BATCH ENDPOINT:${NC}"
        echo "    Add to .htaccess:"
        echo "    <IfModule mod_rewrite.c>"
        echo "        RewriteEngine On"
        echo "        RewriteCond %{REQUEST_URI} ^/wp-json/batch/v1/?$ [NC,OR]"
        echo "        RewriteCond %{QUERY_STRING} (^|&)rest_route=/batch/v1/?(&|$) [NC]"
        echo "        RewriteRule ^ - [F,L]"
        echo "    </IfModule>"
        echo ""
    fi
    
    if [ "$xmlrpc_ok" = "false" ]; then
        echo -e "${YELLOW}[!] CONSIDER BLOCKING XML-RPC:${NC}"
        echo "    Add to .htaccess:"
        echo "    <Files \"xmlrpc.php\">"
        echo "        Require all denied"
        echo "    </Files>"
        echo ""
    fi
    
    if [ "$version_ok" = "true" ] && [ "$batch_ok" = "true" ] && [ "$xmlrpc_ok" = "true" ]; then
        echo -e "${GREEN}[✓] All recommended controls are in place.${NC}"
        echo "    Continue monitoring and keep WordPress updated."
    fi
}

usage() {
    cat <<EOF
Usage: $0 --target <URL> [--verbose]

WordPress wp2shell Hardening Verification Tool

Options:
    --target <URL>    Target WordPress URL (e.g., http://192.168.101.36:8082)
    --verbose         Verbose output
    --help            Show this help message

ETHICAL USE ONLY - Test systems you own or have authorization to test.
EOF
}

main() {
    local target=""
    local verbose="false"
    
    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --target)
                target="$2"
                shift 2
                ;;
            --verbose|-v)
                verbose="true"
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    if [ -z "$target" ]; then
        echo -e "${RED}[!] Error: --target is required${NC}"
        usage
        exit 1
    fi
    
    # Remove trailing slash
    target="${target%/}"
    
    print_banner
    echo -e "${CYAN}[i] Target: $target${NC}"
    echo -e "${CYAN}[i] Ethical use only - testing your own systems${NC}\n"
    
    # Run checks
    local version_ok="true"
    local batch_ok="true"
    local xmlrpc_ok="true"
    
    check_version "$target" "$verbose" || version_ok="false"
    check_batch_hardening "$target" "$verbose" || batch_ok="false"
    check_xmlrpc "$target" "$verbose" || xmlrpc_ok="false"
    
    # Overall status
    echo -e "\n${BLUE}======================================================================${NC}"
    
    if [ "$version_ok" = "true" ] && [ "$batch_ok" = "true" ] && [ "$xmlrpc_ok" = "true" ]; then
        echo -e "${GREEN}${BOLD}[✓] Overall Status: HARDENED${NC}"
    elif [ "$version_ok" = "false" ]; then
        echo -e "${RED}${BOLD}[✗] Overall Status: VULNERABLE - UPDATE REQUIRED${NC}"
    else
        echo -e "${YELLOW}${BOLD}[!] Overall Status: NEEDS IMPROVEMENT${NC}"
    fi
    
    # Print recommendations
    print_recommendations "$version_ok" "$batch_ok" "$xmlrpc_ok"
    
    echo -e "\n${BLUE}======================================================================${NC}\n"
}

main "$@"
