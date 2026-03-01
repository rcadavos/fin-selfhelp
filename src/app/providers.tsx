"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SnackbarProvider } from "@/components/ui/snackbar-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
