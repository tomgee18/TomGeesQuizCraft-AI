'use client';

import React from 'react';
import Head from 'next/head';

/**
 * ContentSecurityPolicy component adds CSP meta tags to protect against XSS and other injection attacks.
 * This provides a fallback for pages that might not be covered by the middleware (e.g., client-side rendered pages).
 * In development mode, CSP is disabled to allow JavaScript evaluation.
 */
export function ContentSecurityPolicy() {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Use a permissive CSP in development mode
  const cspContent = isDevelopment 
    ? "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://storage.googleapis.com https://placehold.co",
        "connect-src 'self' https://generativelanguage.googleapis.com",
        "object-src 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "upgrade-insecure-requests"
      ].join('; ');

  return (
    <Head>
      <meta httpEquiv="Content-Security-Policy" content={cspContent} />
    </Head>
  );
}
