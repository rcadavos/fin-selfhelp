import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OmniTrak",
    short_name: "OmniTrak",
    description:
      "Your all-in-one finance tracker with a built-in AI assistant — bills, cashflow, accounts, goals, lists, and calculators.",
    // Launch the installed app straight into the dashboard; signed-out users are
    // sent to /login?next=/dashboard by middleware. `id` stays "/" so existing
    // installs are treated as the same app and pick up the new start URL.
    start_url: "/dashboard",
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
