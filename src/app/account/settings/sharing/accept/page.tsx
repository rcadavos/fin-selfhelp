import { Suspense } from "react";
import { AcceptShareClient } from "./accept-share-client";

export default function AcceptSharePage() {
  return (
    <main className="w-full min-w-0">
      <Suspense
        fallback={
          <div className="app-main-centered min-h-[40vh]">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <AcceptShareClient />
      </Suspense>
    </main>
  );
}
