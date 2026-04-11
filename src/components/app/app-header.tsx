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
import { ChevronDown, User, Settings2, Menu, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AccountDropdownMenu,
  getAccountDisplayName,
} from "@/components/app/account-dropdown-menu";

const navLinkClass = "text-sm font-medium transition-colors";
const navLinkActiveClass = "text-primary font-semibold";

export function AppHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin(!!user);

  const isDashboard = pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const isMyExpenses = pathname === "/my-expenses" || pathname?.startsWith("/my-expenses/");
  const isToBuy = pathname === "/to-buy" || pathname?.startsWith("/to-buy/");
  const isToDo = pathname === "/to-do" || pathname?.startsWith("/to-do/");
  const isCalculators = pathname?.startsWith("/calculators");
  const isSettings = pathname?.startsWith("/settings");
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        user && "lg:hidden",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className={cn("text-lg font-semibold", user && "lg:hidden")}>
          OmniTrak
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : user ? (
            <>
              {/* Desktop nav: visible from sm up */}
              <div className="hidden sm:flex lg:hidden items-center gap-4">
                <ThemeToggle />
                <Link
                  href="/dashboard"
                  className={cn(navLinkClass, isDashboard ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  Dashboard
                </Link>
                <Link
                  href="/my-expenses"
                  className={cn(navLinkClass, isMyExpenses ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  My Expenses
                </Link>
                <Link
                  href="/calculators"
                  className={cn(navLinkClass, isCalculators ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  Calculators
                </Link>
                <Link
                  href="/to-buy"
                  className={cn(navLinkClass, isToBuy ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  To-Buy
                </Link>
                <Link
                  href="/to-do"
                  className={cn(navLinkClass, isToDo ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  To-Do
                </Link>
                <Link
                  href="/settings"
                  className={cn(
                    navLinkClass,
                    "flex items-center gap-1",
                    isSettings ? navLinkActiveClass : "text-foreground hover:text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Settings
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    prefetch={false}
                    className={cn(navLinkClass, isAdminPage ? navLinkActiveClass : "text-foreground hover:text-primary", "flex items-center gap-1")}
                  >
                    <Settings2 className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </div>
              {/* Mobile nav: hamburger menu */}
              <div className="sm:hidden lg:hidden">
                <ThemeToggle />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden size-10 shrink-0">
                    <Menu className="h-5 w-5" aria-label="Open menu" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:hidden">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className={cn("cursor-pointer", isDashboard && "bg-primary/10 text-primary font-semibold")}>
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-expenses" className={cn("cursor-pointer", isMyExpenses && "bg-primary/10 text-primary font-semibold")}>
                      My Expenses
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/calculators" className={cn("cursor-pointer", isCalculators && "bg-primary/10 text-primary font-semibold")}>
                      Calculators
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/to-buy" className={cn("cursor-pointer", isToBuy && "bg-primary/10 text-primary font-semibold")}>
                      To-Buy List
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/to-do" className={cn("cursor-pointer", isToDo && "bg-primary/10 text-primary font-semibold")}>
                      To-Do List
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className={cn("cursor-pointer flex items-center gap-2", isSettings && "bg-primary/10 text-primary font-semibold")}>
                      <SlidersHorizontal className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" prefetch={false} className={cn("cursor-pointer flex items-center gap-2", isAdminPage && "bg-primary/10 text-primary font-semibold")}>
                        <Settings2 className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="lg:hidden">
                <AccountDropdownMenu
                  user={user}
                  align="end"
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-10 shrink-0 p-0 sm:size-auto sm:gap-1 sm:px-3 sm:max-w-[200px] md:max-w-[260px]"
                      aria-label="Account menu"
                    >
                      <User className="h-5 w-5 sm:hidden" aria-hidden />
                      <span className="hidden sm:inline truncate">{getAccountDisplayName(user)}</span>
                      <ChevronDown className="hidden sm:block h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
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
