"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Receipt,
  Plus,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app/app-sidebar";

const leftItems = [
  { href: "/dashboard/expenses", label: "Expenses", icon: Banknote, exact: false, excludes: ["/dashboard/expenses/categories"] },
  { href: "/dashboard/planned-expenses", label: "Planned", icon: Receipt, exact: false },
];

const rightItems = [
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet, exact: false },
];

export function BottomNavbar() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function NavItem({ href, label, icon: Icon, exact, excludes }: typeof leftItems[number]) {
    const isActive =
      (exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`)) &&
      !excludes?.some((e) => pathname?.startsWith(e));
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn("h-6 w-6", isActive && "fill-primary/10")} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex min-h-16 items-stretch border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {leftItems.map((item) => <NavItem key={item.href} {...item} />)}

        {/* FAB */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="Add entry"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        {rightItems.map((item) => <NavItem key={item.href} {...item} />)}

        {/* More — opens the full navigation */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
                moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="More"
            >
              <MoreHorizontal className="h-6 w-6" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-none p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <AppSidebar
              className="flex h-full !static w-full border-r-0"
              onNavigate={() => setMoreOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </nav>

      <AddEntryPanel open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
