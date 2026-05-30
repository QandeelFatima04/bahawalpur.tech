/** @type {import('next').NextConfig} */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://api:8000";

const API_PREFIXES = ["auth", "students", "companies", "matches", "admin", "health"];

const nextConfig = {
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      // onnxruntime-web (pulled in by @ricky0123/vad-web) ships WASM that
      // webpack 5 must handle with async WebAssembly support enabled.
      // Without this the CoachView chunk fails to load and the browser shows
      // "This page couldn't load" before React's ErrorBoundary can catch it.
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
