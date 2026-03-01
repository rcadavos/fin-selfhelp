import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = getBaseUrl();
  return {
    name: "Financial Tracker",
    short_name: "Fin Tracker",
    description:
      "Track your take-home pay and expenses by category. See at a glance if you're overdraft, breaking even, or have money left over.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#166534",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon", purpose: "any" },
    ],
    scope: baseUrl,
  };
}
