import type { NextConfig } from "next";

function getEnvOrigin(envUrl?: string) {
  if (!envUrl) return null;
  try {
    const url = new URL(envUrl);
    return url.origin;
  } catch {
    return null;
  }
}

const SUPABASE_ORIGIN = getEnvOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_WSS_ORIGIN = SUPABASE_ORIGIN?.replace(/^https:/, "wss:");
const IS_DEV = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  // Server-only AI ingestion libs: keep them out of the bundler so Node require()s
  // them at runtime. Avoids webpack failing on firecrawl's optional `undici`
  // reference and unpdf's `import.meta` usage (which broke the dev compile).
  serverExternalPackages: ["@mendable/firecrawl-js", "unpdf"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/savings-calculator", destination: "/dashboard/savings-calculator", permanent: true },
    ];
  },
  async headers() {
    // Security headers target securityheaders.com (A/B) while allowing
    // required inline JSON-LD and Supabase browser calls.
    const connectSrc = SUPABASE_ORIGIN
      ? `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS_ORIGIN}`
      : "connect-src 'self'";

    const imgSrc = SUPABASE_ORIGIN
      ? `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`
      : "img-src 'self' data: blob:";

    const fontSrc = SUPABASE_ORIGIN
      ? `font-src 'self' data: ${SUPABASE_ORIGIN}`
      : "font-src 'self' data:";

    const cspParts: string[] = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "worker-src 'self'",
      IS_DEV ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      fontSrc,
      connectSrc,
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ];

    const contentSecurityPolicy = cspParts.join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Transport / clickjacking
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },

          // MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Privacy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Feature policy
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=(), payment=()",
          },

          // Legacy XSS protection (still checked by some scanners)
          { key: "X-XSS-Protection", value: "0" },

          // Cross-origin protections (safe defaults for typical web apps)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Avoid breaking cross-origin embedding while satisfying scanners.
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },

          // Compatibility headers
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },

          // Primary CSP for securityheaders.com
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
