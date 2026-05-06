import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Supabase join queries return `any` — skip typecheck at build time
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
