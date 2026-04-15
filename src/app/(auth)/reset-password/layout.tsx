import { AppHeader } from "@/components/app/app-header";

export default function ResetPasswordLayout({
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
