"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppMode } from "@/hooks/use-app-mode";
import { APP_MODE_FALLBACK_ROUTE } from "@/lib/constants/app-mode";

/**
 * URL half of the app-mode gate: a page the current mode switches off is still
 * reachable by typing its address or following an old link, so we bounce it back
 * to the dashboard. Nav/search filtering is the other half. Like the rest of the
 * gate this only hides pages — no data is touched, and switching back to "full"
 * brings every page back as it was.
 *
 * The placeholder (rather than `children`) keeps the blocked page from flashing
 * or firing its queries during the redirect.
 */
export function AppModeGuard({ children }: { children: React.ReactNode }) {
  const { isResolved, isRouteBlocked } = useAppMode();
  const pathname = usePathname();
  const router = useRouter();

  // Wait for the stored preference: mode defaults to "full" until it loads, but a
  // signed-in bills-mode user would otherwise render the page before we know.
  const blocked = isResolved && isRouteBlocked(pathname);

  useEffect(() => {
    if (blocked) router.replace(APP_MODE_FALLBACK_ROUTE);
  }, [blocked, router]);

  if (blocked) {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Taking you back to your dashboard…</p>
      </div>
    );
  }

  return <>{children}</>;
}
