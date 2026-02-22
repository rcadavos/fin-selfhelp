import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Self Help Finance | Simple budget tracking",
  description:
    "Track your take-home pay and expenses by category. See at a glance if you're overdraft, breaking even, or have money left over.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(categoriesQueryOptions());

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
