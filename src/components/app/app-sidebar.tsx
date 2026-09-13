"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calculator,
  Banknote,
  Bell,
  Gem,
  Gift,
  Target,
  Receipt,
  MessageSquarePlus,
  Wallet,
  Car,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import type { AppFeatureKey } from "@/lib/constants/app-mode";
import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
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

type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  premium: boolean;
  /** Left out for pages every app mode keeps visible. */
  feature?: AppFeatureKey;
};

const navItems: readonly SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, premium: false },
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet, premium: false, feature: "accounts" },
  { href: "/dashboard/expenses", label: "Expenses", icon: Banknote, premium: false, feature: "expenses" },
  { href: "/dashboard/bills", label: "Bills", icon: Receipt, premium: false, feature: "bills" },
  { href: "/dashboard/receivables", label: "Receivables", icon: HandCoins, premium: false, feature: "receivables" },
  { href: "/dashboard/vehicles", label: "Vehicles", icon: Car, premium: false, feature: "vehicles" },
  { href: "/dashboard/goals", label: "Goals", icon: Target, premium: false, feature: "goals" },
  { href: "/dashboard/to-do", label: "Reminders", icon: Bell, premium: false, feature: "reminders" },
  { href: "/calculators", label: "Calculators", icon: Calculator, premium: false },
  { href: "/dashboard/referrals", label: "Refer & Earn", icon: Gift, premium: false },
  { href: "/dashboard/feedback", label: "Review & Feedback", icon: MessageSquarePlus, premium: false },
];

export function AppSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isFeatureEnabled } = useAppMode();
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
    ? "bg-primary text-primary-foreground ring-primary/30"
    : subscriptionStatus?.hasProAccess
      ? "bg-primary/10 text-primary ring-primary/30"
      : "bg-muted text-muted-foreground ring-border";
  // `isFeatureEnabled` is rebuilt only when the app mode changes, so this refilters per mode.
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.feature || isFeatureEnabled(item.feature)),
    [isFeatureEnabled]
  );

  if (!user) return null;

  return (
    <aside
      className={cn(
        "flex w-64 flex-col overflow-hidden border-r border-border/80 bg-muted/30 backdrop-blur-sm",
        "fixed left-0 top-0 z-40 h-screen hidden md:flex",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-end gap-0.5 border-b px-3 pb-1">
        <Link
          href="/"
          className="flex min-w-0 items-center"
          title="Omnitrak"
          aria-label="Omnitrak home"
        >
          <SiteLogo className="min-w-0" />
          <span className="sr-only">Omnitrak</span>
        </Link>
        <span className="shrink-0 select-none text-[10px] text-muted-foreground/50 pl-0.5 pb-2">v{APP_VERSION}</span>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:thin]"
        aria-label="Main navigation"
      >
        {visibleNavItems.map(({ href, label, icon: Icon, premium }) => {
          const active = isSidebarNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
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
                <Gem className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Premium" />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="w-full shrink-0 border-t bg-card p-3">
        <AccountDropdownMenu
          user={user}
          align="start"
          side="top"
          trigger={
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 surface border border-border/60 bg-card px-2 py-2 text-left font-normal hover:bg-muted focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 dark:bg-transparent dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
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
                    "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1",
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
