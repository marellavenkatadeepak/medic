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
};

export default nextConfig;
