import { AppHeader } from "@/components/app/app-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Calculators",
  description:
    "Savings calculator and debt payoff calculator. Plan savings with compound interest and Philippine-focused defaults, or see when you'll be debt-free.",
  path: "/calculators",
});

export default function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {children}
    </div>
  );
}
