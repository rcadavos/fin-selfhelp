import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = getBaseUrl();
  return {
    name: "OmniTrak",
    short_name: "OmniTrak",
    description:
      "Your one-stop personal tracker for bills, cashflow, lists, calculators, and more.",
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
