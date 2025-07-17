'use client';

import React from 'react';
import Head from 'next/head';

/**
 * ContentSecurityPolicy component adds CSP meta tags to protect against XSS and other injection attacks
 */
export function ContentSecurityPolicy() {
  // Define CSP directives
  const cspContent = [
    // Default sources restriction
    "default-src 'self'",
    
    // Script sources
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    
    // Style sources
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    
    // Font sources
    "font-src 'self' https://fonts.gstatic.com",
    
    // Image sources
    "img-src 'self' data: https://storage.googleapis.com https://placehold.co",
    
    // Connect sources (for API calls)
    "connect-src 'self' https://generativelanguage.googleapis.com",
    
    // Object sources restriction
    "object-src 'none'",
    
    // Form action restriction
    "form-action 'self'",
    
    // Frame sources restriction
    "frame-src 'self'",
    
    // Base URI restriction
    "base-uri 'self'",
    
    // Upgrade insecure requests
    "upgrade-insecure-requests"
  ].join('; ');

  return (
    <Head>
      <meta httpEquiv="Content-Security-Policy" content={cspContent} />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
    </Head>
  );
}