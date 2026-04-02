// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    // Force Turbopack to treat the ecommerce folder as the root
    root: __dirname,
  },
};

export default nextConfig;
