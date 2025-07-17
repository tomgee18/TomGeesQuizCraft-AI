---
inclusion: fileMatch
fileMatchPattern: 'src/lib/security-*.ts|src/lib/csrf.ts|src/middleware.ts|src/components/security/*.tsx'
---

# Security Implementation Guidelines

This document provides specific guidance for security-related files in the QuizCraft AI application.

## Security Files Reference

This steering rule applies to the following security-related files:
- `src/lib/security-utils.ts`: Utility functions for security operations
- `src/lib/csrf.ts`: CSRF protection implementation
- `src/middleware.ts`: Next.js middleware for security headers
- `src/components/security/*.tsx`: Security-related React components

## Implementation Standards

### Security Utilities

When working with `security-utils.ts`:
- Ensure all sanitization functions properly escape dangerous characters
- Validate all security checks thoroughly
- Add comprehensive JSDoc comments explaining security implications
- Include unit tests for all security utility functions
- Follow the principle of defense in depth

### CSRF Protection

When working with `csrf.ts`:
- Use cryptographically secure random token generation
- Store tokens securely in sessionStorage, not localStorage
- Validate tokens using constant-time comparison when possible
- Apply CSRF protection to all state-changing operations
- Include proper error handling for token validation failures

### Security Middleware

When working with `middleware.ts`:
- Maintain strict Content Security Policy directives
- Apply all recommended security headers
- Ensure headers are applied to all routes except static assets
- Follow OWASP recommendations for header values
- Document any exceptions or relaxations of security policies

### Security Components

When working with security components:
- Ensure CSP headers are properly applied in both server and client contexts
- Use nonces for inline scripts when absolutely necessary
- Implement proper error boundaries for security components
- Avoid client-side rendering of security-critical features when possible

## Security Testing

All changes to security files should be tested for:
- XSS vulnerabilities
- CSRF vulnerabilities
- Header bypass techniques
- Content injection
- Proper sanitization of user input

## References

- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [HTML Sanitization](https://cheatsheetseries.owasp.org/cheatsheets/HTML_Sanitization_Cheat_Sheet.html)

#[[file:src/lib/security-utils.ts]]
#[[file:src/lib/csrf.ts]]
#[[file:src/middleware.ts]]
#[[file:src/components/security/csp-headers.tsx]]