"use client";

import { createContext, useCallback, useContext, useState } from "react";

type BudgetRefreshContextValue = {
  refreshKey: number;
  refreshBudget: () => void;
};

const BudgetRefreshContext = createContext<BudgetRefreshContextValue | null>(null);

export function BudgetRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshBudget = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);
  return (
    <BudgetRefreshContext.Provider value={{ refreshKey, refreshBudget }}>
      {children}
    </BudgetRefreshContext.Provider>
  );
}

export function useBudgetRefresh(): BudgetRefreshContextValue {
  const ctx = useContext(BudgetRefreshContext);
  if (!ctx) throw new Error("useBudgetRefresh must be used within BudgetRefreshProvider");
  return ctx;
}
