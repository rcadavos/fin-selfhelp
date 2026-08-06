"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutGrid, Users, Tags, CreditCard, Gift, MessageSquareText, Lightbulb, Bell, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/pricing", label: "Pricing", icon: CreditCard },
  { href: "/admin/referrals", label: "Referrals", icon: Gift },
  { href: "/admin/ocr", label: "OCR", icon: ScanLine },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/suggestions", label: "Suggestions", icon: Lightbulb },
] as const;

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-background md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back to app
          </Link>
        </div>
        <nav className="flex flex-row gap-0.5 overflow-x-auto p-2 md:flex-col md:overflow-x-visible" aria-label="Admin">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === "/admin" : pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div data-app-scroll="true" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
