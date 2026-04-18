import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { buildDefaultMetadata, getBaseUrl } from "@/lib/seo";
import "./globals.css";
import { Providers } from "./providers";
import { ScrollToTopButton } from "@/components/app/scroll-to-top-button";
import { CookieConsentDialog } from "@/components/app/cookie-consent-dialog";
import { ServiceWorkerRegister } from "@/components/app/service-worker-register";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = buildDefaultMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  /** Reduces odd layout jumps when the on-screen keyboard opens (Chrome/Android; safe elsewhere). */
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OmniTrak",
    description:
      "Bill payment tracker and expense dashboard: bills by category, monthly paid status, to-buy and to-do lists, and calculators.",
    url: baseUrl,
    applicationCategory: "FinanceApplication",
  };

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geistSans.variable)}>
      <head />

      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <HydrationBoundary>
            <ServiceWorkerRegister />
            <div className="app-root">
              {children}
              <ScrollToTopButton />
              <CookieConsentDialog />
            </div>
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
