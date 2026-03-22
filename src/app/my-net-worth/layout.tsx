import { AppHeader } from "@/components/app/app-header";

export default function MyNetWorthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <AppHeader />
      {children}
    </div>
  );
}
