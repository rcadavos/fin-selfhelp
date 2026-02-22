"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { SnackbarProvider } from "@/components/ui/snackbar-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryProvider>
  );
}
