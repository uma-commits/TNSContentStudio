import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/labs/aicontentstudio",
  output: "standalone",
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
