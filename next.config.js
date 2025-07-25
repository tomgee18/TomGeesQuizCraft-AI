// Next.js configuration
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // config options here
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add headers configuration for Content Security Policy
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js specific modules in client-side bundles
    if (!isServer) {
      // Prevent webpack from trying to bundle these Node.js dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // OpenTelemetry related
        '@opentelemetry/exporter-jaeger': false,
        '@opentelemetry/sdk-node': false,
        // Node.js core modules
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        path: require.resolve('path-browserify'),
      };

      // Add buffer polyfill
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );

      // Add process polyfill
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      );
    }

    // Add noParse rule for problematic modules
    config.module.noParse = [
      /node_modules\/handlebars/,
    ];

    // Add resolve aliases for problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/handlebars.min.js',
    };

    return config;
  },
};

module.exports = nextConfig;