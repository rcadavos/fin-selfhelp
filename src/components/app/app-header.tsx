"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import {
  User,
  ChevronDown,
  Settings2,
  Menu,
  SlidersHorizontal,
  Building2,
  Wallet,
  Gem,
  LayoutDashboard,
  Banknote,
  Calculator,
  ShoppingCart,
  ClipboardList,
  UsersRound,
  Target,
} from "lucide-react";
import { NotificationsMenu } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDropdownMenu, getAccountAvatarUrl } from "@/components/app/account-dropdown-menu";
import { SiteLogo } from "@/components/app/site-logo";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app/app-sidebar";

export function AppHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin(!!user);
  const avatarUrl = user ? getAccountAvatarUrl(user) : null;
  const showAuthenticatedHeader = Boolean(user) || loading;

  const isDashboardHome = pathname === "/dashboard";
  const isMyExpenses =
    pathname === "/dashboard/my-expenses" || pathname?.startsWith("/dashboard/my-expenses/");
  const isMyGoals =
    pathname === "/dashboard/my-goals" || pathname?.startsWith("/dashboard/my-goals/");
  const isToBuy = pathname === "/dashboard/to-buy" || pathname?.startsWith("/dashboard/to-buy/");
  const isToDo = pathname === "/dashboard/to-do" || pathname?.startsWith("/dashboard/to-do/");
  const isCalculators = pathname?.startsWith("/dashboard/calculators");
  const isRentTracker =
    pathname === "/dashboard/rent-tracker" || pathname?.startsWith("/dashboard/rent-tracker/");
  const isPaymentTracker =
    pathname === "/dashboard/payment-tracker" || pathname?.startsWith("/dashboard/payment-tracker/");
  const isSettings = pathname?.startsWith("/account/settings");
  const isShared =
    pathname === "/account/shared" || Boolean(pathname?.startsWith("/account/shared/"));
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        showAuthenticatedHeader && "md:hidden",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Burger Menu (Mobile Only) */}
        <div className="flex flex-1 items-center md:hidden">
          {showAuthenticatedHeader && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10">
                  <Menu className="h-5 w-5" aria-label="Open menu" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-none">
                <AppSidebar className="flex h-full !static w-full border-r-0" />
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Center: Logo */}
        <div className="flex flex-1 justify-center md:justify-start">
          <Link
            href="/"
            className={cn("flex items-center", showAuthenticatedHeader && "md:hidden")}
            title="Omnitrak"
            aria-label="Omnitrak home"
          >
            <SiteLogo />
            <span className="sr-only">Omnitrak</span>
          </Link>
        </div>

        {/* Right: Actions (Theme, Notifications, etc.) */}
        <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          {showAuthenticatedHeader ? (
            <>
              <ThemeToggle />
              <NotificationsMenu />
              {/* Account Dropdown: Hidden on mobile (moved to Sidebar), shown on desktop (if needed, though AppShell handles desktop toolbar) */}
              {loading ? (
                <span
                  className="hidden md:inline-block h-10 w-[3.5rem] shrink-0 rounded-md bg-muted/80"
                  aria-hidden
                />
              ) : (
                <div className="hidden md:block">
                  <AccountDropdownMenu
                    user={user!}
                    align="end"
                    trigger={
                      <Button
                        variant="ghost"
                        className="h-10 shrink-0 gap-1 rounded-md px-2 hover:bg-slate-200/90 focus-visible:bg-slate-200/90 focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 dark:hover:bg-zinc-700/90 dark:focus-visible:bg-zinc-700/90"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-foreground">
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
