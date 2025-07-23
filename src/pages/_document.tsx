import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Html lang="en">
      <Head>
        {/* Disable CSP in development mode */}
        {isDevelopment && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}