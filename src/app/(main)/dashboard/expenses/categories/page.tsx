import { Suspense } from "react";
import { CategoriesBoard } from "@/components/dashboard/categories-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <CategoriesBoard />
    </Suspense>
  );
}
