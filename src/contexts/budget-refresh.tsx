"use client";

import { createContext, useCallback, useContext } from "react";

type BudgetRefreshContextValue = {
  refreshBudget: () => void;
};

const BudgetRefreshContext = createContext<BudgetRefreshContextValue | null>(null);

export function BudgetRefreshProvider({ children }: { children: React.ReactNode }) {
  // Stable no-op — data refreshes are handled by React Query invalidations after mutations.
  // refreshKey was previously here but was never consumed by any component; removing it
  // prevents spurious re-renders of every useBudgetRefresh() subscriber on every mutation.
  const refreshBudget = useCallback(() => {}, []);
  return (
    <BudgetRefreshContext.Provider value={{ refreshBudget }}>
      {children}
    </BudgetRefreshContext.Provider>
  );
}

export function useBudgetRefresh(): BudgetRefreshContextValue {
  const ctx = useContext(BudgetRefreshContext);
  if (!ctx) throw new Error("useBudgetRefresh must be used within BudgetRefreshProvider");
  return ctx;
}
