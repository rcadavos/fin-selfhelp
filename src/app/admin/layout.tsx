import { redirect } from "next/navigation";
import { unstable_noStore } from "next/cache";
import { getAdminGuard } from "@/actions/admin";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  unstable_noStore();
  const guard = await getAdminGuard();
  if (!guard.allowed) redirect(guard.redirectTo ?? "/");

  return (
    <div className="app-layout flex min-h-dvh flex-1 flex-col">
      <AdminAppShell>{children}</AdminAppShell>
    </div>
  );
}
