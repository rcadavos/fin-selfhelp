import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { getAdminGuard } from "@/actions/admin";

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
    <div className="app-layout">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/admin" className="shrink-0 text-lg font-semibold">
            Admin
          </Link>
          <nav className="flex max-w-full flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm sm:gap-x-4">
            <Link href="/admin" className="text-sm font-medium text-foreground">
              Users
            </Link>
            <Link href="/admin/categories" className="text-sm font-medium text-foreground">
              Categories
            </Link>
            <Link href="/admin/pricing" className="text-sm font-medium text-foreground">
              Pricing
            </Link>
            <Link href="/admin/reviews" className="text-sm font-medium text-foreground">
              Reviews
            </Link>
            <Link href="/admin/suggestions" className="text-sm font-medium text-foreground">
              Suggestions
            </Link>
            <Link href="/my-cashflow" className="text-sm text-muted-foreground hover:text-foreground">
              My Cashflow
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
