import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/my-cashflow", permanent: true },
      { source: "/net-worth", destination: "/my-net-worth", permanent: true },
    ];
  },
};

export default nextConfig;
