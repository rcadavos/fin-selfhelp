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
import { User, Settings2, Menu, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDropdownMenu } from "@/components/app/account-dropdown-menu";

export function AppHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin(!!user);

  const isDashboardHome = pathname === "/dashboard";
  const isMyExpenses =
    pathname === "/dashboard/my-expenses" || pathname?.startsWith("/dashboard/my-expenses/");
  const isToBuy = pathname === "/dashboard/to-buy" || pathname?.startsWith("/dashboard/to-buy/");
  const isToDo = pathname === "/dashboard/to-do" || pathname?.startsWith("/dashboard/to-do/");
  const isCalculators = pathname?.startsWith("/dashboard/calculators");
  const isSettings = pathname?.startsWith("/account/settings");
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        user && "md:hidden",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className={cn("text-lg font-semibold", user && "md:hidden")}>
          OmniTrak
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : user ? (
            <>
              {/* Mobile only (below md): md+ uses sidebar + shell toolbar */}
              <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-10 shrink-0">
                      <Menu className="h-5 w-5" aria-label="Open menu" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 md:hidden">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className={cn("cursor-pointer", isDashboardHome && "bg-primary/10 text-primary font-semibold")}>
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/my-expenses" className={cn("cursor-pointer", isMyExpenses && "bg-primary/10 text-primary font-semibold")}>
                        My Expenses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/calculators" className={cn("cursor-pointer", isCalculators && "bg-primary/10 text-primary font-semibold")}>
                        Calculators
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/to-buy" className={cn("cursor-pointer", isToBuy && "bg-primary/10 text-primary font-semibold")}>
                        To-Buy List
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/to-do" className={cn("cursor-pointer", isToDo && "bg-primary/10 text-primary font-semibold")}>
                        To-Do List
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/settings" className={cn("cursor-pointer flex items-center gap-2", isSettings && "bg-primary/10 text-primary font-semibold")}>
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
                <AccountDropdownMenu
                  user={user}
                  align="end"
                  trigger={
                    <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Account menu">
                      <User className="h-5 w-5" aria-hidden />
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
