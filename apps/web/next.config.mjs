/** @type {import('next').NextConfig} */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://api:8000";

const API_PREFIXES = ["auth", "students", "companies", "matches", "admin", "health"];

const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 uses Turbopack by default. Turbopack handles WASM natively so
  // no extra config is needed. The empty object silences the "webpack config
  // present but no turbopack config" build error.
  turbopack: {},
  // Kept for explicit --webpack builds: enables async WebAssembly so
  // onnxruntime-web (used by @ricky0123/vad-web) bundles correctly.
  webpack(config, { isServer }) {
    if (!isServer) {
      config.experiments = { ...config.experiments, asyncWebAssembly: true };
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
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
