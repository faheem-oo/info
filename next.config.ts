import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Ensure Next.js treats this folder as the workspace root
  turbopack: {
    root: __dirname,
  },
  // Optimize for production deployment
  output: 'standalone',
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Configure server runtime
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['info-zeta-ten.vercel.app', 'localhost:3000'],
    },
  },
};

export default nextConfig;
