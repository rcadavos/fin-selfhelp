"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Receipt,
  House,
  Wallet,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { href: "/dashboard/expenses", label: "Expenses", icon: Banknote, exact: false, excludes: ["/dashboard/expenses/categories"] },
  { href: "/dashboard/bills", label: "Bills", icon: Receipt, exact: false },
  { href: "/dashboard", label: "Home", icon: House, exact: true },
  { href: "/dashboard/expenses/categories", label: "Category", icon: LayoutGrid, exact: false },
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet, exact: false },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0.5rem)" }}
    >
      {bottomNavItems.map(({ href, label, icon: Icon, exact, excludes }) => {
        const isActive =
          (exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`)) &&
          !excludes?.some((e) => pathname?.startsWith(e));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-6 w-6", isActive && "fill-primary/10")} />
            {label && <span className="text-[10px] font-medium">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
