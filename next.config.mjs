// Converted from next.config.ts to next.config.mjs for Next.js compatibility

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

export default nextConfig;
