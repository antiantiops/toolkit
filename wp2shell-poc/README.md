# wp2shell-poc - WordPress Hardening Verification Tool

**⚠️ ETHICAL USE ONLY ⚠️**

This tool is designed for **defensive security testing** of WordPress installations you own or have explicit authorization to test. Unauthorized testing of systems you do not own is illegal.

## Purpose

Verify WordPress hardening against the wp2shell exploit chain (CVE-2026-63030 + CVE-2026-60137) that combines:
- REST API batch endpoint desynchronization
- SQL injection in post query layer

This tool **does not exploit** the vulnerabilities. It only checks if hardening controls are in place.

## CVE Details

- **CVE-2026-63030**: REST API batch endpoint validation flaw
- **CVE-2026-60137**: SQL injection in `author__not_in` parameter
- **Affected versions**: WordPress 6.9.0-6.9.4, 7.0.0-7.0.1
- **Fixed in**: 6.9.5, 7.0.2+

## What This Tool Does

✅ Check WordPress version
✅ Test if `/wp-json/batch/v1` endpoint is blocked
✅ Test if `?rest_route=/batch/v1` fallback is blocked
✅ Verify XML-RPC is disabled
✅ Report hardening status with recommendations

## What This Tool Does NOT Do

❌ Create admin accounts
❌ Upload webshells
❌ Execute shell commands
❌ Modify target system
❌ Perform actual exploitation

## Installation

```bash
cd wp2shell-poc
pip install -r requirements.txt
```

## Usage

**Test your own WordPress installation:**

```bash
python3 wp2shell_check.py --target http://192.168.101.36:8082
```

**Verbose output:**

```bash
python3 wp2shell_check.py --target http://192.168.101.36:8082 --verbose
```

## Example Output

```
[+] WordPress Hardening Check - wp2shell (CVE-2026-63030 + CVE-2026-60137)
[i] Target: http://192.168.101.36:8082
[i] Ethical use only - testing your own systems

[+] Checking WordPress version...
[✓] WordPress 7.0.2 detected
[✓] Version is NOT vulnerable (patched)

[+] Checking REST batch endpoint hardening...
[✓] /wp-json/batch/v1 returns HTTP 403 (blocked)
[✓] /?rest_route=/batch/v1 returns HTTP 403 (blocked)

[+] Checking XML-RPC hardening...
[✓] /xmlrpc.php returns HTTP 403 (blocked)

[✓] Overall Status: HARDENED
[+] All recommended controls are in place.
```

## Recommendations

If any tests fail, apply these hardening measures:

1. **Update WordPress**: Patch to 6.9.5+ or 7.0.2+
2. **Block REST batch endpoint** in `.htaccess`:
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteCond %{REQUEST_URI} ^/wp-json/batch/v1/?$ [NC,OR]
       RewriteCond %{QUERY_STRING} (^|&)rest_route=/batch/v1/?(&|$) [NC]
       RewriteRule ^ - [F,L]
   </IfModule>
   ```
3. **Block XML-RPC** if not needed:
   ```apache
   <Files "xmlrpc.php">
       Require all denied
   </Files>
   ```
4. **Enable auto-updates** in `wp-config.php`:
   ```php
   define( 'WP_AUTO_UPDATE_CORE', true );
   ```

## References

- [Bitdefender Advisory](https://www.bitdefender.com/en-us/blog/businessinsights/technical-advisory-wp2shell-unauthenticated-remote-code-execution-full-site-takeover-wordpress-core)
- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [WordPress Security Release 7.0.2](https://wordpress.org/news/2026/07/wordpress-7-0-2-security-release/)

## License

MIT License - For defensive security testing only.

## Disclaimer

This tool is provided for educational and defensive security purposes only. The authors are not responsible for misuse. Always obtain proper authorization before testing any system.
