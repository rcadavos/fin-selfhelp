import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OmniTrak",
    short_name: "OmniTrak",
    description:
      "Your all-in-one finance tracker with a built-in AI assistant — bills, cashflow, accounts, goals, lists, and calculators.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    background_color: "#ffffff",
    theme_color: "#166534",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
