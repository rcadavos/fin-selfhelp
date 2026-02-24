import { AppHeader } from "@/components/app/app-header";

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {children}
    </div>
  );
}
