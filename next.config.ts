import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.0.121', '192.168.0.*', '*.local'],
};
export default nextConfig;
