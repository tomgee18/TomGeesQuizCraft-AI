/**
 * Security Utilities
 * 
 * This module provides security-related utility functions for the application.
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html The HTML string to sanitize
 * @returns A sanitized version of the HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Replace potentially dangerous characters
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a file name for security issues
 * @param fileName The file name to validate
 * @returns True if the file name is safe, false otherwise
 */
export function isValidFileName(fileName: string): boolean {
  if (!fileName) return false;
  
  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  
  // Check for null bytes and control characters
  if (/[\x00-\x1F\x7F]/.test(fileName)) {
    return false;
  }
  
  // Check for suspicious extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.php'];
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (suspiciousExtensions.includes(`.${extension}`)) {
    return false;
  }
  
  return true;
}

/**
 * Validates a URL for security issues
 * @param url The URL to validate
 * @returns True if the URL is safe, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a nonce for use in Content Security Policy
 * @returns A random nonce string
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates and sanitizes user input
 * @param input The user input to validate
 * @returns A sanitized version of the input
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  // Remove any script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Validates if a string contains only safe characters
 * @param input The string to validate
 * @returns True if the string contains only safe characters, false otherwise
 */
export function containsOnlySafeCharacters(input: string): boolean {
  if (!input) return true;
  
  // Check for potentially dangerous characters
  const unsafePattern = /[<>'"&;()]/;
  return !unsafePattern.test(input);
}

/**
 * Validates if a string is a safe JSON string
 * @param input The string to validate
 * @returns True if the string is a safe JSON string, false otherwise
 */
export function isSafeJsonString(input: string): boolean {
  if (!input) return false;
  
  try {
    JSON.parse(input);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Implements rate limiting for function calls
 * @param fn The function to rate limit
 * @param delay The minimum time between function calls in milliseconds
 * @returns A rate-limited version of the function
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastCall));
    }
    
    lastCall = Date.now();
    return fn(...args);
  };
}

/**
 * Validates and sanitizes file content
 * @param content The file content to validate
 * @param maxSize The maximum allowed size in bytes
 * @returns True if the content is safe, false otherwise
 */
export function isSafeFileContent(content: string | ArrayBuffer, maxSize: number): boolean {
  // Check file size
  const size = content instanceof ArrayBuffer ? content.byteLength : content.length;
  if (size > maxSize) {
    return false;
  }
  
  // For string content, check for malicious patterns
  if (typeof content === 'string') {
    // Check for script tags, iframes, etc.
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/i,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/i,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
  }
  
  return true;
}