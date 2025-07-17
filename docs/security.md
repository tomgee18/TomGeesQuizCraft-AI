# Security Documentation for QuizCraft AI

This document outlines the security measures implemented in the QuizCraft AI application to protect user data and prevent common web vulnerabilities.

## Security Features

### 1. API Key Protection
- API keys are stored in sessionStorage instead of localStorage for improved security
- Keys are encrypted before storage using a simple obfuscation technique (base64 encoding with character reversal)
- Keys are never sent to our servers, all API calls are made directly from the client
- API key validation occurs before any API requests are made

### 2. Content Security Policy (CSP)
- Strict CSP implemented to prevent XSS attacks
- Restricts script sources to trusted domains (`'self'` and `unpkg.com`)
- Restricts style sources to trusted domains (`'self'` and `fonts.googleapis.com`)
- Restricts font sources to trusted domains (`'self'` and `fonts.gstatic.com`)
- Restricts image sources to trusted domains (`'self'`, `data:`, `storage.googleapis.com`, and `placehold.co`)
- Restricts connect sources to trusted domains (`'self'` and `generativelanguage.googleapis.com`)
- Prevents inline script execution except where necessary
- Blocks loading of resources from untrusted sources
- CSP is applied both via Next.js middleware and meta tags for client-side rendering

### 3. CSRF Protection
- CSRF tokens generated and validated for state-changing operations
- Tokens stored in sessionStorage and included in requests
- Automatic initialization of CSRF protection on application load
- Validation of CSRF tokens before sensitive operations
- Helps prevent cross-site request forgery attacks

### 4. Secure Cookie Handling
- Cookies set with SameSite=Strict attribute
- Secure flag added when using HTTPS
- Prevents cookies from being sent in cross-site requests

### 5. File Upload Security
- Strict validation of file types using both MIME type and extension checks
- File size limits enforced (10MB maximum)
- Filename validation to prevent path traversal attacks
- Content validation for uploaded files
- Timeout protection for file processing operations to prevent hanging on malicious files
- File content size validation (20MB max for processing)
- Text content truncation for extremely large documents (1MB limit)
- Sanitization of extracted text content to prevent XSS attacks
- Error handling with specific error messages for different failure scenarios

### 6. Input Sanitization
- User input is sanitized to prevent XSS attacks
- HTML content is properly escaped
- Regular expressions are used safely

### 7. Security Headers
- X-Content-Type-Options: nosniff - Prevents MIME type sniffing
- X-Frame-Options: DENY - Prevents clickjacking attacks
- X-XSS-Protection: 1; mode=block - Enables browser XSS protection
- Referrer-Policy: strict-origin-when-cross-origin - Controls referrer information
- Permissions-Policy: restricts access to sensitive browser features (camera, microphone, geolocation)
- Strict-Transport-Security: enforces HTTPS connections with long-term caching
- Content-Security-Policy: detailed policy controlling resource loading

All security headers are automatically applied via Next.js middleware to every response except static assets.

## Security Best Practices for Developers

### 1. Code Review Guidelines
- Always validate user input
- Use parameterized queries for database operations
- Avoid using dangerous functions like eval() or innerHTML
- Implement proper error handling

### 2. Authentication Best Practices
- Use strong password policies
- Implement multi-factor authentication where possible
- Use secure session management
- Implement proper account lockout mechanisms

### 3. Data Protection
- Minimize collection of sensitive data
- Encrypt sensitive data at rest and in transit
- Implement proper access controls
- Follow data retention policies

## Security Incident Response

In case of a security incident:

1. Identify and isolate affected systems
2. Assess the impact and scope of the breach
3. Contain the breach and fix vulnerabilities
4. Notify affected users if necessary
5. Document the incident and update security measures

## Regular Security Maintenance

- Keep all dependencies updated
- Regularly audit code for security vulnerabilities
- Conduct periodic security testing
- Stay informed about new security threats and best practices

## Contact

If you discover a security vulnerability, please contact us at security@quizcraft.example.com rather than using the public issue tracker.