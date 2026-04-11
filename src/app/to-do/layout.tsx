import { AppShell } from "@/components/app/app-shell";

export default function ToDoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout app-layout--shell">
      <AppShell>{children}</AppShell>
    </div>
  );
}
