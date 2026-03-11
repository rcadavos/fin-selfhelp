"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { ChevronDown, User, CreditCard, Shield, LogOut, Settings2, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const name = user?.user_metadata?.full_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user?.email ?? "Account";
}

const navLinkClass = "text-sm font-medium transition-colors";
const navLinkActiveClass = "text-primary font-semibold";

export function AppHeader({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin(!!user);

  const isMyCashflow = pathname?.startsWith("/my-cashflow");
  const isMyNetWorth = pathname?.startsWith("/my-net-worth");
  const isCalculators = pathname?.startsWith("/calculators");
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href={user ? "/my-cashflow" : "/"} className="text-lg font-semibold">
          FinTrack
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">…</span>
          ) : user ? (
            <>
              {/* Desktop nav: visible from sm up */}
              <div className="hidden sm:flex items-center gap-4">
                <ThemeToggle />
                <Link
                  href="/my-cashflow"
                  className={cn(navLinkClass, isMyCashflow ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  My Cashflow
                </Link>
                <Link
                  href="/my-net-worth"
                  className={cn(navLinkClass, isMyNetWorth ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  My Net Worth
                </Link>
                <Link
                  href="/calculators"
                  className={cn(navLinkClass, isCalculators ? navLinkActiveClass : "text-foreground hover:text-primary")}
                >
                  Calculators
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
              <div className="sm:hidden">
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
                    <Link href="/my-cashflow" className={cn("cursor-pointer", isMyCashflow && "bg-primary/10 text-primary font-semibold")}>
                      My Cashflow
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-net-worth" className={cn("cursor-pointer", isMyNetWorth && "bg-primary/10 text-primary font-semibold")}>
                      My Net Worth
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/calculators" className={cn("cursor-pointer", isCalculators && "bg-primary/10 text-primary font-semibold")}>
                      Calculators
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-10 shrink-0 p-0 sm:size-auto sm:gap-1 sm:px-3 sm:max-w-[200px] md:max-w-[260px]"
                    aria-label="Account menu"
                  >
                    <User className="h-5 w-5 sm:hidden" aria-hidden />
                    <span className="hidden sm:inline truncate">{getDisplayName(user)}</span>
                    <ChevronDown className="hidden sm:block h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user?.email && (
                    <>
                      <DropdownMenuLabel className="font-normal text-muted-foreground truncate px-2 py-1.5">
                        {user.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      router.push("/subscription");
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/security" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      Password & Security
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e: Event) => {
                      e.preventDefault();
                      signOut();
                    }}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
