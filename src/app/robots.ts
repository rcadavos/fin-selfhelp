import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          // Referral short links only set a cookie and redirect — nothing to index.
          "/r/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
