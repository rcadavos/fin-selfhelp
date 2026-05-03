import type { Metadata } from "next";

const SITE_NAME = "OmniTrak";
const DEFAULT_TITLE = "OmniTrak — Your all-in-one personal tracker for everything";
const DEFAULT_DESCRIPTION =
  "Planned expense tracker and expense dashboard: track planned expenses by category, mark paid each month, to-buy and to-do lists, and calculators — see at a glance where you stand.";
const TWITTER_HANDLE = ""; // e.g. "@omnitrak" if you have one

/** Base URL for canonical and OG URLs. Set NEXT_PUBLIC_SITE_URL in production. Must be HTTPS for Open Graph. */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://omnitrak.cloud";
  const url = raw.startsWith("http") ? raw : `https://${raw.replace(/^\/\//, "")}`;
  return url.replace(/^http:\/\//, "https://");
}

export const seo = {
  siteName: SITE_NAME,
  defaultTitle: DEFAULT_TITLE,
  defaultDescription: DEFAULT_DESCRIPTION,
  twitterHandle: TWITTER_HANDLE,
};

export type PageMeta = {
  title?: string | null;
  description?: string | null;
  path?: string | null;
  noIndex?: boolean;
  imagePath?: string | null;
  imageAlt?: string | null;
};

/**
 * Build metadata for a page. Use in layout.tsx or page.tsx via export const metadata = buildPageMetadata({ ... }).
 * Root layout should use buildDefaultMetadata() for site-wide defaults.
 */
export function buildPageMetadata(meta: PageMeta): Metadata {
  const baseUrl = getBaseUrl();
  const path = meta.path?.replace(/^\//, "") ?? "";
  const url = path ? `${baseUrl}/${path}` : baseUrl;
  const title = meta.title ?? DEFAULT_TITLE;
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const ogImage = meta.imagePath
    ? `${baseUrl}/${meta.imagePath.replace(/^\//, "")}`
    : `${baseUrl}/opengraph-image`;

  const openGraph: Metadata["openGraph"] = {
    type: "website",
    locale: "en_US",
    url,
    siteName: SITE_NAME,
    title,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: meta.imageAlt ?? `${SITE_NAME} — ${description.slice(0, 100)}`,
      },
    ],
  };

  const twitter: Metadata["twitter"] = {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    ...(TWITTER_HANDLE ? { creator: TWITTER_HANDLE, site: TWITTER_HANDLE } : {}),
  };

  return {
    title: title,
    description,
    keywords: [
      "OmniTrak",
      "personal tracker",
      "bill payment tracker",
      "expense dashboard",
      "cashflow tracker",
      "expense tracker",
      "to-do list",
      "budget",
      "personal finance",
      "Philippines",
      "savings calculator",
      "debt payoff",
      "to-buy list",
      "shopping list",
    ],
    authors: [{ name: SITE_NAME, url: baseUrl }],
    creator: SITE_NAME,
    metadataBase: new URL(baseUrl),
    ...(meta.path !== undefined && { alternates: { canonical: url } }),
    openGraph,
    twitter,
    robots: meta.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

/** Default site-wide metadata (root layout). Uses title template so child routes get "Page | OmniTrak". */
export function buildDefaultMetadata(): Metadata {
  const base = buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  });
  return {
    ...base,
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
    title: {
      default: DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
      apple: [{ url: "/favicon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}
