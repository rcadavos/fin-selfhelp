"use client";

import { HydrationBoundary as TanstackHydrationBoundary } from "@tanstack/react-query";
import type { DehydratedState } from "@tanstack/react-query";

export function HydrationBoundary({
  state,
  children,
}: {
  state?: DehydratedState;
  children: React.ReactNode;
}) {
  if (!state) {
    return <>{children}</>;
  }
  return (
    <TanstackHydrationBoundary state={state}>{children}</TanstackHydrationBoundary>
  );
}
