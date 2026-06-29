import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { AcceptShareClient } from "./accept-share-client";

export default function AcceptSharePage() {
  return (
    <main className="w-full min-w-0">
      <Suspense
        fallback={
          <div className="app-main-centered min-h-[40vh]">
            <DashboardSkeleton variant="page" />
          </div>
        }
      >
        <AcceptShareClient />
      </Suspense>
    </main>
  );
}
