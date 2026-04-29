import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date().toISOString();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}${LEGAL_ROUTES.hub}`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${baseUrl}${LEGAL_ROUTES.terms}`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}${LEGAL_ROUTES.privacy}`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}${LEGAL_ROUTES.cookies}`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}${LEGAL_ROUTES.noSale}`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
