import { Suspense } from "react";
import { ExpenseCashflowPage } from "@/components/dashboard/expense-cashflow-page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  path: "/dashboard",
  title: "Dashboard",
  noIndex: true,
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="dashboard" />}>
      <ExpenseCashflowPage pageVariant="dashboard" />
    </Suspense>
  );
}
