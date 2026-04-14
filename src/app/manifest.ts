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
    theme_color: "#0f2918",
    icons: [{ src: "/favicon.png", type: "image/png", purpose: "any" }],
    scope: baseUrl,
  };
}
