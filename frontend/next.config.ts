import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, './'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r2.vidzflow.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
      },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist has optional Node.js dependencies that don't exist in the browser
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
