"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  ShoppingCart,
  Settings2,
  SlidersHorizontal,
  UsersRound,
  Banknote,
  ClipboardList,
  Building2,
  Wallet,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import {
  AccountDropdownMenu,
  getAccountDisplayName,
} from "@/components/app/account-dropdown-menu";

function isSidebarNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, premium: false },
  { href: "/dashboard/my-expenses", label: "My Expenses", icon: Banknote, premium: false },
  { href: "/dashboard/to-buy", label: "To-Buy", icon: ShoppingCart, premium: false },
  { href: "/dashboard/to-do", label: "To-Do", icon: ClipboardList, premium: false },
  { href: "/dashboard/calculators", label: "Calculators", icon: Calculator, premium: false },
  { href: "/dashboard/rent-tracker", label: "Rent Tracker", icon: Building2, premium: true },
  { href: "/dashboard/payment-tracker", label: "Payment Tracker", icon: Wallet, premium: true },
  { href: "/account/settings", label: "Settings", icon: SlidersHorizontal, premium: false },
] as const;

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAdmin } = useIsAdmin(!!user);

  if (!user) return null;

  return (
    <aside
      className={cn(
        /* Fixed left: does not shrink the main column in flex; main uses md:pl-56 for offset */
        "fixed left-0 top-0 z-40 hidden w-56 flex-col overflow-hidden border-r border-border/80 bg-muted/30 shadow-sm backdrop-blur-sm",
        "md:flex",
        "h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]",
        "max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          OmniTrak
        </Link>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:thin]"
        aria-label="Main navigation"
      >
        {navItems.map(({ href, label, icon: Icon, premium }) => {
          const active = isSidebarNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {premium ? (
                <Gem className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-400" aria-label="Premium" />
              ) : null}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            prefetch={false}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname?.startsWith("/admin")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>
      <div className="shrink-0 px-3 py-2">
        <Link
          href="/account/shared"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isSidebarNavActive(pathname, "/account/shared")
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">Shared with me</span>
        </Link>
      </div>
      <div
        className={cn(
          "w-full shrink-0 border-t bg-muted/95 p-3 backdrop-blur",
          "supports-[backdrop-filter]:bg-muted/80"
        )}
      >
        <AccountDropdownMenu
          user={user}
          align="start"
          side="top"
          trigger={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-2 py-2 text-left font-normal hover:bg-muted"
              aria-label="Account menu"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {getAccountDisplayName(user)}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          }
        />
      </div>
    </aside>
  );
}
