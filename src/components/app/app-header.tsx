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
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDropdownMenu, getAccountAvatarUrl } from "@/components/app/account-dropdown-menu";
import { SiteLogo } from "@/components/app/site-logo";

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
        <Link
          href="/"
          className={cn("flex items-center", showAuthenticatedHeader && "md:hidden")}
          title="mnitrak"
          aria-label="mnitrak home"
        >
          <SiteLogo />
          <span className="sr-only">mnitrak</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          {showAuthenticatedHeader ? (
            <>
              {/* Mobile only (below md): md+ uses sidebar + shell toolbar */}
              <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                {loading ? (
                  <>
                    <span
                      className="inline-block size-10 shrink-0 rounded-md bg-muted/80"
                      aria-hidden
                    />
                    <span
                      className="inline-block h-10 w-[3.5rem] shrink-0 rounded-md bg-muted/80"
                      aria-hidden
                    />
                  </>
                ) : (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-10 shrink-0">
                          <Menu className="h-5 w-5" aria-label="Open menu" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[16rem] md:hidden">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isDashboardHome && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/my-expenses"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isMyExpenses && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <Banknote className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        My Expenses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/my-goals"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isMyGoals && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <Target className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        My Goals
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/to-buy"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isToBuy && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <ShoppingCart className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        To-Buy List
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/to-do"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isToDo && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <ClipboardList className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        To-Do List
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/rent-tracker"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isRentTracker && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <Building2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        Rent Tracker
                        <Gem className="ml-auto h-3.5 w-3.5 shrink-0 text-sky-500" aria-label="Premium" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/payment-tracker"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isPaymentTracker && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <Wallet className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        Payment Tracker
                        <Gem className="ml-auto h-3.5 w-3.5 shrink-0 text-sky-500" aria-label="Premium" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/calculators"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isCalculators && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <Calculator className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        Calculators
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/account/settings"
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          isSettings && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <SlidersHorizontal className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          prefetch={false}
                          className={cn(
                            "flex cursor-pointer items-center gap-2",
                            isAdminPage && "bg-primary/10 font-semibold text-primary"
                          )}
                        >
                          <Settings2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AccountDropdownMenu
                      user={user!}
                      align="end"
                      trigger={
                        <Button
                          variant="ghost"
                          className="h-10 shrink-0 gap-1 rounded-md px-2 hover:bg-slate-200/90 focus-visible:bg-slate-200/90 focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 dark:hover:bg-zinc-700/90 dark:focus-visible:bg-zinc-700/90"
                          aria-label="Account menu"
                        >
                          <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-border/60">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt=""
                                width={24}
                                height={24}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center">
                                <User className="h-4 w-4" aria-hidden />
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            className="h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 ease-out group-data-[state=open]:-rotate-180"
                            aria-hidden
                          />
                        </Button>
                      }
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {pathname !== "/login" && (
                <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Home
                </Link>
              )}
              <Link href="/login" className="text-sm font-medium text-foreground">
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
