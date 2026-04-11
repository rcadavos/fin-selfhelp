"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SnackbarProvider } from "@/components/ui/snackbar-provider";
import { UserPreferencesProvider } from "@/contexts/user-preferences-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <UserPreferencesProvider>
          <SnackbarProvider>{children}</SnackbarProvider>
        </UserPreferencesProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
