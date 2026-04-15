import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Calculators",
  description:
    "Savings calculator and debt payoff calculator. Plan savings with compound interest and Philippine-focused defaults, or see when you'll be debt-free.",
  path: "/dashboard/calculators",
});

/** Route segment metadata only — shell comes from `dashboard/layout.tsx`. */
export default function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
