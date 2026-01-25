import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/react-website',
  assetPrefix: '/react-website/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
