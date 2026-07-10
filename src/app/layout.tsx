import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Schibsted_Grotesk } from "next/font/google";
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

/** Passbook display + body + UI face. */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
    { media: "(prefers-color-scheme: light)", color: "#F7F8F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1310" },
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
      "Personal finance tracker with a built-in AI assistant: expenses, planned expenses, accounts, goals, reminders, and calculators, plus Ask OmniTrak — a private AI assistant for questions about your money and your own documents.",
    url: baseUrl,
    applicationCategory: "FinanceApplication",
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", schibsted.variable, geistSans.variable)}
    >
      <head />

      <body
        className={`${schibsted.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
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
