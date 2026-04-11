import { AppShell } from "@/components/app/app-shell";
import { BudgetRefreshProvider } from "@/contexts/budget-refresh";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BudgetRefreshProvider>
      <div className="app-layout app-layout--shell">
        <AppShell>{children}</AppShell>
      </div>
    </BudgetRefreshProvider>
  );
}
