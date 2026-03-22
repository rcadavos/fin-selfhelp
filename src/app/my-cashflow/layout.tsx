import { AppHeader } from "@/components/app/app-header";
import { NetTakeHomeBar } from "@/components/app/net-take-home-bar";
import { BudgetRefreshProvider } from "@/contexts/budget-refresh";

export default function MyCashflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BudgetRefreshProvider>
      <div className="app-layout">
        <AppHeader />
        <NetTakeHomeBar />
        {children}
      </div>
    </BudgetRefreshProvider>
  );
}
