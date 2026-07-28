import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/contentstudio",
  output: "standalone",
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
