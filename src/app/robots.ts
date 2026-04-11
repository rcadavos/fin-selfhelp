import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/", "/dashboard", "/my-expenses", "/profile", "/subscription", "/payment", "/reset-password", "/forgot-password", "/to-buy", "/to-do"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
