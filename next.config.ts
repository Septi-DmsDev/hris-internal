import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
};

export default nextConfig;
