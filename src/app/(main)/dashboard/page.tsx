import { Suspense } from "react";
import { ExpenseCashflowPage } from "@/components/dashboard/expense-cashflow-page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  path: "/dashboard",
  title: "Dashboard",
  description:
    "Your money at a glance: what is in your accounts, the bills left to pay this month with a Mark as paid button on each, and how this month's spending compares with last month.",
  imageAlt:
    "OmniTrak dashboard: money in your accounts, bills left to pay this month and a Bills to pay list",
  noIndex: false,
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="dashboard" />}>
      <ExpenseCashflowPage pageVariant="dashboard" />
    </Suspense>
  );
}
