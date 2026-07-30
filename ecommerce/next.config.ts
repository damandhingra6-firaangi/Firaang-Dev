// next.config.ts
import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  reactCompiler: true,
};

export default nextConfig;
