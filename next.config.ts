import type { NextConfig } from "next";

const isGithubPages =
  process.env.GITHUB_ACTIONS === 'true' ||
  Boolean(process.env.NEXT_PUBLIC_BASE_PATH);

const basePath = isGithubPages ? process.env.NEXT_PUBLIC_BASE_PATH || '/pdf-unlocker' : '';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: false,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
