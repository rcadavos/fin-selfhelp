"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Target,
  Gem,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  {
    href: "/dashboard/my-expenses",
    label: "Expenses",
    icon: Banknote,
  },
  {
    href: "/dashboard/my-goals",
    label: "Goal",
    icon: Target,
  },
  {
    href: "/dashboard/premium",
    label: "Premium",
    icon: Gem,
  },
  {
    href: "/dashboard/to-buy",
    label: "To buy",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/to-do",
    label: "To do",
    icon: ClipboardList,
  },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden pt-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0.5rem)" }}
    >
      {bottomNavItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
