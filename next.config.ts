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

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/net-worth", destination: "/dashboard", permanent: true },
      { source: "/my-net-worth", destination: "/dashboard", permanent: true },
      { source: "/my-cashflow", destination: "/my-expenses", permanent: true },
      { source: "/shared/:grantorUserId/my-cashflow", destination: "/shared/:grantorUserId/my-expenses", permanent: true },
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
      "script-src 'self' 'unsafe-inline'",
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
