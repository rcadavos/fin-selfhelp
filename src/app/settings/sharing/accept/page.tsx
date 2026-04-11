import { Suspense } from "react";
import { AcceptShareClient } from "./accept-share-client";

export default function AcceptSharePage() {
  return (
    <Suspense
      fallback={
        <main className="app-main-centered">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <AcceptShareClient />
    </Suspense>
  );
}
