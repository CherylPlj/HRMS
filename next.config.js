/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  // Transpile rate-limiter-flexible to resolve .d.ts parsing issues
  transpilePackages: ['rate-limiter-flexible'],
  // Add empty turbopack config to silence Next.js 16 warning
  // Webpack config will be used for builds, Turbopack for dev (if compatible)
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    // Exclude .d.ts files from being parsed by webpack
    // This prevents webpack from trying to parse TypeScript definition files
    config.module.rules.push({
      test: /\.d\.ts$/,
      use: 'ignore-loader',
    });
    
    // Handle react-pdf specific modules
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });
    
    return config;
  },
};

module.exports = nextConfig; 