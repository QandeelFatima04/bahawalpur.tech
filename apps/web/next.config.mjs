/** @type {import('next').NextConfig} */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://api:8000";

const API_PREFIXES = ["auth", "students", "companies", "matches", "admin", "health"];

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return API_PREFIXES.map((prefix) => ({
      source: `/${prefix}/:path*`,
      destination: `${API_INTERNAL_URL}/${prefix}/:path*`,
    })).concat([
      { source: "/health", destination: `${API_INTERNAL_URL}/health` },
    ]);
  },
};

export default nextConfig;
