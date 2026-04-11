"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SnackbarProvider } from "@/components/ui/snackbar-provider";
import { BudgetRefreshProvider } from "@/contexts/budget-refresh";
import { UserPreferencesProvider } from "@/contexts/user-preferences-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <BudgetRefreshProvider>
          <SnackbarProvider>
            <UserPreferencesProvider>{children}</UserPreferencesProvider>
          </SnackbarProvider>
        </BudgetRefreshProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
