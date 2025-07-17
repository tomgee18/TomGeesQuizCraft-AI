/**
 * CSRF Protection Utility
 * 
 * This module provides functions for generating and validating CSRF tokens
 * to protect against Cross-Site Request Forgery attacks.
 */

/**
 * Generates a random CSRF token
 * @returns A random string to be used as a CSRF token
 */
export function generateCsrfToken(): string {
  // Generate a random string of 32 characters
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores a CSRF token in sessionStorage
 * @param token The CSRF token to store
 */
export function storeCsrfToken(token: string): void {
  try {
    sessionStorage.setItem('csrf-token', token);
  } catch (error) {
    console.error('Error storing CSRF token:', error);
  }
}

/**
 * Retrieves the stored CSRF token
 * @returns The stored CSRF token or null if not found
 */
export function getCsrfToken(): string | null {
  try {
    return sessionStorage.getItem('csrf-token');
  } catch (error) {
    console.error('Error retrieving CSRF token:', error);
    return null;
  }
}

/**
 * Validates a CSRF token against the stored token
 * @param token The token to validate
 * @returns True if the token is valid, false otherwise
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken();
  return !!storedToken && token === storedToken;
}

/**
 * Initializes CSRF protection by generating and storing a token if one doesn't exist
 * @returns The CSRF token
 */
export function initCsrfProtection(): string {
  let token = getCsrfToken();
  if (!token) {
    token = generateCsrfToken();
    storeCsrfToken(token);
  }
  return token;
}