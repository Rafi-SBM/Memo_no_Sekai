import type { NextConfig } from "next";

/**
 * Headers that are the same for every request. The content security policy is
 * not here: it carries a per-request nonce and is set in `middleware.ts`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    // Nothing in the app needs a camera, a microphone or a location.
    key: "Permissions-Policy",
    value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A build must not ship with a type error or a lint error; both gates stay on.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false, dirs: ["app", "lib"] },
  // The native SQLite binding is only reachable in local development, so it must
  // not be traced into a serverless bundle.
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The worker must be revalidated or an old shell survives a deploy.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
