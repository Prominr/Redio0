\# Security Policy



\## Supported Versions



| Version | Supported          |

| ------- | ------------------ |

| 4.0.x   | ✅ Yes            |

| < 4.0   | ❌ No             |



\## Reporting a Vulnerability



If you discover a security vulnerability in Redio, please report it responsibly:



1\. \*\*DO NOT\*\* disclose the vulnerability publicly

2\. Email security@redio.site with details

3\. Include:

&nbsp;  - Description of the vulnerability

&nbsp;  - Steps to reproduce

&nbsp;  - Potential impact

&nbsp;  - Suggested fix (if any)



We will acknowledge receipt within 48 hours and provide a fix timeline.



\## Security Features



Redio includes the following security measures:



\### 1. Input Validation

\- All URLs are validated before processing

\- HTML sanitization for proxy responses

\- Rate limiting on proxy endpoints



\### 2. Content Security

\- Iframe sandboxing with appropriate permissions

\- CORS headers properly configured

\- No eval() or unsafe inline scripts



\### 3. Privacy Protection

\- No user data collection by default

\- Local storage for user preferences only

\- Optional password protection



\### 4. Network Security

\- Rate limiting (100 requests/15 minutes per IP)

\- Blocked internal IP ranges

\- Timeouts on external requests



\## Best Practices for Users



1\. \*\*Use Strong Passwords\*\*: If enabling password protection

2\. \*\*Regular Updates\*\*: Keep your Redio instance updated

3\. \*\*Monitor Usage\*\*: Regularly check access logs

4\. \*\*Backup Settings\*\*: Export settings regularly

5\. \*\*Use HTTPS\*\*: Always deploy with SSL/TLS



\## Known Security Considerations



\### Proxy Risks

\- Redio acts as a web proxy, which can be abused

\- Implement network-level protections

\- Monitor for abuse patterns



\### Cloaking Features

\- Cloaking is for educational purposes only

\- Use responsibly and ethically

\- Comply with local laws and policies



\### User Data

\- All data stored locally (browser)

\- No server-side user data storage

\- Export/Import functionality available



\## Updates and Patches



Security updates will be released as:

\- \*\*Critical\*\*: Within 24 hours

\- \*\*High\*\*: Within 72 hours

\- \*\*Medium\*\*: Within 1 week

\- \*\*Low\*\*: Next scheduled release



\## Third-Party Dependencies



All dependencies are regularly updated:

\- Express.js - Web framework

\- Helmet.js - Security headers

\- Node Fetch - HTTP client



\## Contact



\- Security Team: security@redio.site

\- GitHub Issues: For non-sensitive bugs

\- Discord: For community support



---



\*\*Note\*\*: Redio is provided "as is" without warranty. Use at your own risk.

