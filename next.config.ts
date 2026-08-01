import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/labs/ugc_content_yorbi",
  output: "standalone",
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
