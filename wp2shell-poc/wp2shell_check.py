#!/usr/bin/env python3
"""
wp2shell Hardening Verification Tool
CVE-2026-63030 + CVE-2026-60137

ETHICAL USE ONLY - Test systems you own or have authorization to test.
"""

import argparse
import sys
import re
from urllib.parse import urljoin, urlparse
try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("[!] Error: requests library not found. Install with: pip install requests")
    sys.exit(1)


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_banner():
    """Print tool banner"""
    print(f"{Colors.HEADER}")
    print("=" * 70)
    print("  wp2shell Hardening Verification Tool")
    print("  CVE-2026-63030 + CVE-2026-60137")
    print("=" * 70)
    print(f"{Colors.ENDC}")
    print(f"{Colors.WARNING}[!] ETHICAL USE ONLY - Test your own systems{Colors.ENDC}\n")


def create_session():
    """Create requests session with retry logic"""
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=(500, 502, 503, 504)
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session


def check_wordpress_version(session, target, verbose=False):
    """
    Check WordPress version from meta generator tag
    Returns: (version_string, is_vulnerable)
    """
    print(f"{Colors.OKBLUE}[+] Checking WordPress version...{Colors.ENDC}")
    
    try:
        response = session.get(target, timeout=10)
        
        # Try to find WordPress version in meta generator tag
        version_match = re.search(r'<meta name="generator" content="WordPress ([0-9.]+)"', response.text)
        
        if not version_match:
            if verbose:
                print(f"{Colors.WARNING}[i] Could not detect WordPress version from meta tag{Colors.ENDC}")
            return None, None
        
        version = version_match.group(1)
        print(f"{Colors.OKCYAN}[i] WordPress {version} detected{Colors.ENDC}")
        
        # Check if version is vulnerable
        vulnerable_ranges = [
            ('6.9.0', '6.9.4'),
            ('7.0.0', '7.0.1')
        ]
        
        is_vulnerable = False
        for min_ver, max_ver in vulnerable_ranges:
            if version >= min_ver and version <= max_ver:
                is_vulnerable = True
                break
        
        if is_vulnerable:
            print(f"{Colors.FAIL}[✗] Version IS vulnerable to wp2shell{Colors.ENDC}")
        else:
            print(f"{Colors.OKGREEN}[✓] Version is NOT vulnerable (patched or not affected){Colors.ENDC}")
        
        return version, is_vulnerable
        
    except requests.RequestException as e:
        print(f"{Colors.FAIL}[✗] Error checking version: {e}{Colors.ENDC}")
        return None, None


def check_endpoint(session, url, endpoint_name, verbose=False):
    """
    Check if an endpoint is blocked
    Returns: (status_code, is_blocked)
    """
    try:
        response = session.get(url, timeout=10, allow_redirects=False)
        status = response.status_code
        
        # 403 Forbidden or 404 Not Found are both acceptable (endpoint blocked or removed)
        is_blocked = status in [403, 404]
        
        if verbose:
            print(f"{Colors.OKCYAN}[i] {endpoint_name}: HTTP {status}{Colors.ENDC}")
        
        if is_blocked:
            if status == 403:
                print(f"{Colors.OKGREEN}[✓] {endpoint_name} returns HTTP 403 (blocked){Colors.ENDC}")
            else:
                print(f"{Colors.OKGREEN}[✓] {endpoint_name} returns HTTP 404 (endpoint removed){Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}[✗] {endpoint_name} returns HTTP {status} (NOT blocked){Colors.ENDC}")
        
        return status, is_blocked
        
    except requests.RequestException as e:
        print(f"{Colors.FAIL}[✗] Error checking {endpoint_name}: {e}{Colors.ENDC}")
        return None, False


def check_rest_batch_hardening(session, target, verbose=False):
    """Check if REST batch endpoint is properly blocked"""
    print(f"\n{Colors.OKBLUE}[+] Checking REST batch endpoint hardening...{Colors.ENDC}")
    
    results = []
    
    # Check direct REST endpoint
    batch_url = urljoin(target, '/wp-json/batch/v1')
    _, blocked1 = check_endpoint(session, batch_url, '/wp-json/batch/v1', verbose)
    results.append(blocked1)
    
    # Check query string fallback
    fallback_url = urljoin(target, '/?rest_route=/batch/v1')
    _, blocked2 = check_endpoint(session, fallback_url, '?rest_route=/batch/v1', verbose)
    results.append(blocked2)
    
    return all(results)


def check_xmlrpc_hardening(session, target, verbose=False):
    """Check if XML-RPC is disabled"""
    print(f"\n{Colors.OKBLUE}[+] Checking XML-RPC hardening...{Colors.ENDC}")
    
    xmlrpc_url = urljoin(target, '/xmlrpc.php')
    
    try:
        response = session.post(xmlrpc_url, timeout=10, allow_redirects=False)
        status = response.status_code
        
        is_blocked = status in [403, 404, 405]
        
        if verbose:
            print(f"{Colors.OKCYAN}[i] /xmlrpc.php: HTTP {status}{Colors.ENDC}")
        
        if is_blocked:
            print(f"{Colors.OKGREEN}[✓] /xmlrpc.php returns HTTP {status} (blocked){Colors.ENDC}")
        else:
            print(f"{Colors.WARNING}[!] /xmlrpc.php returns HTTP {status} (accessible - consider blocking){Colors.ENDC}")
        
        return is_blocked
        
    except requests.RequestException as e:
        print(f"{Colors.FAIL}[✗] Error checking XML-RPC: {e}{Colors.ENDC}")
        return False


def print_recommendations(version_vulnerable, batch_blocked, xmlrpc_blocked):
    """Print hardening recommendations based on test results"""
    print(f"\n{Colors.HEADER}{'=' * 70}{Colors.ENDC}")
    print(f"{Colors.BOLD}Recommendations:{Colors.ENDC}\n")
    
    if version_vulnerable:
        print(f"{Colors.FAIL}[!] UPDATE REQUIRED:{Colors.ENDC}")
        print("    - Update WordPress to 6.9.5+ or 7.0.2+")
        print("    - Enable auto-updates: define('WP_AUTO_UPDATE_CORE', true);")
    
    if not batch_blocked:
        print(f"{Colors.FAIL}[!] BLOCK REST BATCH ENDPOINT:{Colors.ENDC}")
        print("    Add to .htaccess:")
        print("    <IfModule mod_rewrite.c>")
        print("        RewriteEngine On")
        print("        RewriteCond %{REQUEST_URI} ^/wp-json/batch/v1/?$ [NC,OR]")
        print("        RewriteCond %{QUERY_STRING} (^|&)rest_route=/batch/v1/?(&|$) [NC]")
        print("        RewriteRule ^ - [F,L]")
        print("    </IfModule>")
    
    if not xmlrpc_blocked:
        print(f"{Colors.WARNING}[!] CONSIDER BLOCKING XML-RPC:{Colors.ENDC}")
        print("    Add to .htaccess:")
        print("    <Files \"xmlrpc.php\">")
        print("        Require all denied")
        print("    </Files>")
    
    if version_vulnerable == False and batch_blocked and xmlrpc_blocked:
        print(f"{Colors.OKGREEN}[✓] All recommended controls are in place.{Colors.ENDC}")
        print("    Continue monitoring and keep WordPress updated.")


def main():
    parser = argparse.ArgumentParser(
        description='WordPress wp2shell Hardening Verification Tool',
        epilog='ETHICAL USE ONLY - Test systems you own or have authorization to test.'
    )
    parser.add_argument(
        '--target',
        required=True,
        help='Target WordPress URL (e.g., http://192.168.101.36:8082)'
    )
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Verbose output'
    )
    parser.add_argument(
        '--no-color',
        action='store_true',
        help='Disable colored output'
    )
    
    args = parser.parse_args()
    
    # Disable colors if requested
    if args.no_color:
        for attr in dir(Colors):
            if not attr.startswith('_'):
                setattr(Colors, attr, '')
    
    # Validate target URL
    parsed = urlparse(args.target)
    if not parsed.scheme or not parsed.netloc:
        print(f"{Colors.FAIL}[!] Invalid target URL{Colors.ENDC}")
        sys.exit(1)
    
    # Ensure target ends without trailing slash
    target = args.target.rstrip('/')
    
    print_banner()
    print(f"{Colors.OKCYAN}[i] Target: {target}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}[i] Ethical use only - testing your own systems{Colors.ENDC}\n")
    
    # Create session
    session = create_session()
    
    # Run checks
    version, version_vulnerable = check_wordpress_version(session, target, args.verbose)
    batch_blocked = check_rest_batch_hardening(session, target, args.verbose)
    xmlrpc_blocked = check_xmlrpc_hardening(session, target, args.verbose)
    
    # Overall status
    print(f"\n{Colors.HEADER}{'=' * 70}{Colors.ENDC}")
    
    if version_vulnerable == False and batch_blocked and xmlrpc_blocked:
        print(f"{Colors.OKGREEN}{Colors.BOLD}[✓] Overall Status: HARDENED{Colors.ENDC}")
    elif version_vulnerable:
        print(f"{Colors.FAIL}{Colors.BOLD}[✗] Overall Status: VULNERABLE - UPDATE REQUIRED{Colors.ENDC}")
    else:
        print(f"{Colors.WARNING}{Colors.BOLD}[!] Overall Status: NEEDS IMPROVEMENT{Colors.ENDC}")
    
    # Print recommendations
    print_recommendations(version_vulnerable, batch_blocked, xmlrpc_blocked)
    
    print(f"\n{Colors.HEADER}{'=' * 70}{Colors.ENDC}\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}[!] Interrupted by user{Colors.ENDC}")
        sys.exit(130)
