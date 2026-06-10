import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config silences the "webpack config present but no turbopack config"
  // warning introduced in Next.js 16 where Turbopack is the default dev bundler.
  turbopack: {},
};

export default nextConfig;
