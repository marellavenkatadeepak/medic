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
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), xr-spatial-tracking=()',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist has optional Node.js dependencies that don't exist in the browser
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    // Suppress SES/LavaMoat warnings
    config.optimization.minimize = true;
    return config;
  },
};

export default nextConfig;
