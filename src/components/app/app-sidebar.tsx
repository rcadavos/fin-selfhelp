"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import {
  AccountDropdownMenu,
  getAccountAvatarUrl,
  getAccountDisplayName,
} from "@/components/app/account-dropdown-menu";
import { SiteLogo } from "@/components/app/site-logo";
import { subscriptionStatusQueryOptions } from "@/lib/query/subscription-user";

function isSidebarNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, premium: false },
  { href: "/dashboard/my-expenses", label: "My Expenses", icon: Banknote, premium: false },
  { href: "/dashboard/my-goals", label: "My Goals", icon: Target, premium: false },
  { href: "/dashboard/to-buy", label: "To-Buy", icon: ShoppingCart, premium: false },
  { href: "/dashboard/to-do", label: "To-Do", icon: ClipboardList, premium: false },
  { href: "/dashboard/rent-tracker", label: "Rent Tracker", icon: Building2, premium: true },
  { href: "/dashboard/payment-tracker", label: "Payment Tracker", icon: Wallet, premium: true },
  { href: "/dashboard/calculators", label: "Calculators", icon: Calculator, premium: false },
  { href: "/account/settings", label: "Settings", icon: SlidersHorizontal, premium: false },
] as const;

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAdmin } = useIsAdmin(!!user);
  const { data: subscriptionStatus } = useQuery({
    ...subscriptionStatusQueryOptions(),
    enabled: !!user,
  });
  const avatarUrl = user ? getAccountAvatarUrl(user) : null;
  const subscriptionLabel = subscriptionStatus?.hasPremiumAccess
    ? "Premium"
    : subscriptionStatus?.hasProAccess
      ? "Pro"
      : "Free";
  const subscriptionBadgeClass = subscriptionStatus?.hasPremiumAccess
    ? "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30"
    : subscriptionStatus?.hasProAccess
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30"
      : "bg-muted text-muted-foreground ring-border";

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
      <div className="flex h-14 shrink-0 items-center border-b px-3">
        <Link
          href="/"
          className="flex min-w-0 max-w-full items-center"
          title="mnitrak"
          aria-label="mnitrak home"
        >
          <SiteLogo className="max-w-full" />
          <span className="sr-only">mnitrak</span>
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
              className="h-auto w-full justify-start gap-2 px-2 py-2 text-left font-normal hover:bg-slate-200/90 focus-visible:bg-slate-200/90 focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 dark:hover:bg-zinc-700/90 dark:focus-visible:bg-zinc-700/90"
              aria-label="Account menu"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-4 w-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 text-left text-sm font-medium">
                <span className="block truncate">{getAccountDisplayName(user)}</span>
                <span
                  className={cn(
                    "mt-0.5 inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold leading-none ring-1",
                    subscriptionBadgeClass
                  )}
                >
                  {subscriptionLabel}
                </span>
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 ease-out group-data-[state=open]:-rotate-180"
                aria-hidden
              />
            </Button>
          }
        />
      </div>
    </aside>
  );
}
