import { AppHeader } from "@/components/app/app-header";
import { NetTakeHomeBar } from "@/components/app/net-take-home-bar";
import { BudgetRefreshProvider } from "@/contexts/budget-refresh";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BudgetRefreshProvider>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <NetTakeHomeBar />
        {children}
      </div>
    </BudgetRefreshProvider>
  );
}
