import type { Metadata } from "next";

const SITE_NAME = "Financial Tracker";
const DEFAULT_TITLE = "Financial Tracker — Track Take-Home Pay & Expenses";
const DEFAULT_DESCRIPTION =
  "Track your take-home pay and expenses by category. See at a glance if you're overdraft, breaking even, or have money left over.";
const TWITTER_HANDLE = ""; // e.g. "@fin-track" if you have one

/** Base URL for canonical and OG URLs. Set NEXT_PUBLIC_SITE_URL in production (e.g. https://fin-track.cloud). Must be HTTPS for Open Graph. */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://fin-track.cloud";
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
      "cashflow tracker",
      "expense tracker",
      "take-home pay",
      "budget",
      "personal finance",
      "Philippines",
      "savings calculator",
      "debt payoff",
    ],
    authors: [{ name: SITE_NAME, url: baseUrl }],
    creator: SITE_NAME,
    metadataBase: new URL(baseUrl),
    alternates: { canonical: url },
    openGraph,
    twitter,
    robots: meta.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

/** Default site-wide metadata (root layout). Uses title template so child routes get "Page | Financial Tracker". */
export function buildDefaultMetadata(): Metadata {
  const base = buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  });
  return {
    ...base,
    title: {
      default: DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
  };
}
