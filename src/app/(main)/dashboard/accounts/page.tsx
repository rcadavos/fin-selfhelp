import { Suspense } from "react";
import { AccountsBoard } from "@/components/dashboard/accounts-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function AccountsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <AccountsBoard />
    </Suspense>
  );
}
