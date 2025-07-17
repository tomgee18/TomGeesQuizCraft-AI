# Security Guidelines for QuizCraft AI

This document outlines security best practices that must be followed when developing and maintaining the QuizCraft AI application.

## Security Principles

- **Defense in Depth**: Implement multiple layers of security controls
- **Least Privilege**: Provide minimum necessary access for functionality
- **Secure by Default**: All features should be secure without additional configuration
- **Fail Securely**: Error conditions should not expose sensitive information or functionality

## Required Security Measures

### API Key Protection
- Store API keys in sessionStorage (not localStorage) for improved security
- Encrypt keys before storage using appropriate techniques
- Never send API keys to our servers; all API calls should be made directly from the client
- Validate API keys before making any API requests

### Content Security Policy (CSP)
- Maintain strict CSP to prevent XSS attacks
- Restrict resource loading to trusted domains only
- Prevent inline script execution except where absolutely necessary
- Apply CSP via both Next.js middleware and meta tags for client-side rendering

### CSRF Protection
- Generate and validate CSRF tokens for all state-changing operations
- Store tokens in sessionStorage and include in requests
- Initialize CSRF protection on application load
- Validate tokens before processing sensitive operations

### File Upload Security
- Validate file types using both MIME type and extension checks
- Enforce file size limits (10MB maximum)
- Validate filenames to prevent path traversal attacks
- Implement content validation for uploaded files
- Apply timeout protection for file processing operations
- Sanitize extracted text content to prevent XSS attacks

### Input Sanitization
- Sanitize all user input to prevent XSS attacks
- Properly escape HTML content
- Use regular expressions safely and avoid ReDoS vulnerabilities

### Security Headers
- Apply all security headers via Next.js middleware:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: restrict access to sensitive browser features
  - Strict-Transport-Security: enforce HTTPS connections
  - Content-Security-Policy: detailed policy controlling resource loading

## Code Review Security Checklist

- [ ] All user input is validated and sanitized
- [ ] No dangerous functions like eval() or innerHTML are used
- [ ] Proper error handling is implemented
- [ ] Security headers are correctly applied
- [ ] File uploads are properly validated and sanitized
- [ ] CSRF protection is implemented for state-changing operations
- [ ] API keys and sensitive data are properly protected
- [ ] Dependencies are up-to-date and free from known vulnerabilities