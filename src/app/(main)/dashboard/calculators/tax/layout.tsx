import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Philippine Tax Calculator",
  description:
    "Estimate your income tax, SSS, PhilHealth, and Pag-IBIG contributions based on TRAIN Law rates. See your take-home pay.",
  path: "/dashboard/calculators/tax",
});

export default function TaxCalculatorLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
