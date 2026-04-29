import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 120, // cache RSC payload 2 menit di client saat navigasi antar halaman
      static: 300,
    },
  },
};

export default nextConfig;
