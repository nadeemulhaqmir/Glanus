# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Glanus seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**security@glanus.com**

If you prefer encrypted communication, you can use our PGP key:
[Link to PGP key if available]

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- **24 hours**: We will acknowledge receipt of your vulnerability report
- **7 days**: We will send a more detailed response indicating the next steps
- **90 days**: We aim to have a fix released and publicly disclosed

### Disclosure Policy

- We request that you give us a reasonable amount of time to fix the vulnerability before public disclosure
- We will credit security researchers who responsibly disclose vulnerabilities
- We will include researchers in our security hall of fame (with permission)

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version of Glanus
2. **Strong Passwords**: Use strong, unique passwords
3. **HTTPS Only**: Always access Glanus over HTTPS in production
4. **Environment Variables**: Never commit `.env` files or secrets to version control
5. **Database Security**: Use strong database passwords and restrict access
6. **Agent Security**: Only install agents from official sources

### For Developers

1. **Dependencies**: Keep all dependencies up to date
2. **Code Review**: All code changes must be reviewed before merging
3. **Input Validation**: Validate and sanitize all user inputs
4. **Authentication**: Use secure authentication methods and strong password policies
5. **Secrets Management**: Use environment variables or secret managers
6. **SQL Injection**: Use Prisma's parameterized queries (never raw SQL with user input)
7. **XSS Protection**: Sanitize HTML output and use React's built-in protections
8. **CSRF Protection**: Use CSRF tokens for all state-changing operations

## Known Security Considerations

### Agent Communication

- All agent communication uses HTTPS
- Auth tokens are stored in OS-native secure storage (Keychain, Credential Manager, Secret Service)
- SHA-256 checksums verify installer integrity
- Pre-auth tokens are single-use and cleared after registration

### Web Application

- NextAuth.js handles authentication
- JWT-based session strategy for scalability
- CORS configured for API endpoints
- Rate limiting on sensitive endpoints

### Remote Desktop (Planned)

- WebRTC signaling infrastructure in place
- TURN server credentials should be configured when deployed

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.1, 0.1.2) and announced via:

- GitHub Security Advisories
- Email notifications to registered users
- Release notes

## Bug Bounty Program

We do not currently have a formal bug bounty program, but we deeply appreciate security researchers who help us keep Glanus secure. We recognize contributions in our release notes and security hall of fame.

## Hall of Fame

We would like to thank the following researchers for responsibly disclosing security issues:

<!-- List will be updated as vulnerabilities are reported and fixed -->

(No vulnerabilities reported yet)

## Questions?

If you have any questions about this security policy, please contact:

**security@glanus.com**

---

Last updated: 2026-02-16
