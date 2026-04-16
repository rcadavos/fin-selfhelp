"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

type SearchItem = {
  title: string;
  href: string;
  keywords: string;
};

const SEARCH_ITEMS: SearchItem[] = [
  { title: "Dashboard", href: "/dashboard", keywords: "home overview expenses summary" },
  { title: "My Expenses", href: "/dashboard/my-expenses", keywords: "bills spend spending due paid" },
  { title: "My Goals", href: "/dashboard/my-goals", keywords: "goals achieved target milestones" },
  { title: "To-Buy", href: "/dashboard/to-buy", keywords: "shopping list buy purchase" },
  { title: "To-Do", href: "/dashboard/to-do", keywords: "tasks checklist todo" },
  { title: "Calculators", href: "/dashboard/calculators", keywords: "savings debt payoff calculator tools" },
  { title: "Rent Tracker", href: "/dashboard/rent-tracker", keywords: "rent property landlord premium" },
  { title: "Payment Tracker", href: "/dashboard/payment-tracker", keywords: "payments tracker bills premium" },
  { title: "Account Settings", href: "/account/settings", keywords: "settings preferences account" },
  { title: "Profile", href: "/account/profile", keywords: "profile name phone avatar" },
  { title: "Security", href: "/account/security", keywords: "security password login" },
  { title: "Sharing", href: "/account/settings/sharing", keywords: "share partner invite access" },
  { title: "Subscription", href: "/account/subscription", keywords: "subscription plan billing premium pro" },
  { title: "Shared With Me", href: "/account/shared", keywords: "shared partner access" },
  { title: "Admin", href: "/admin", keywords: "admin manage reviews suggestions users categories" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const showAuthenticatedShell = Boolean(user) || loading;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as SearchItem[];
    return SEARCH_ITEMS.filter((item) => {
      const hay = `${item.title} ${item.keywords} ${item.href}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 8);
  }, [query]);

  useEffect(() => {
    setOpen(results.length > 0);
    setActiveIdx(0);
  }, [results.length]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const goTo = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
      <AppSidebar />
      {/* pl-56 reserves space for fixed sidebar so page content is full width of the remaining viewport (not squeezed / trimmed) */}
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col md:min-h-0 md:overflow-hidden",
          showAuthenticatedShell && "md:pl-56"
        )}
      >
        {showAuthenticatedShell ? (
          <header
            className="relative z-0 hidden h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block"
            aria-label="App toolbar"
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 sm:px-20 md:px-28">
              <div className="pointer-events-auto w-full max-w-md">
                <label htmlFor="app-shell-search" className="sr-only">
                  Search
                </label>
                <div className="relative" ref={searchWrapRef}>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="app-shell-search"
                    type="search"
                    placeholder="Search…"
                    className="h-9 pl-9"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      if (results.length > 0) setOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (!open && e.key === "Enter" && results[0]) {
                        e.preventDefault();
                        goTo(results[0].href);
                        return;
                      }
                      if (!open) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIdx((i) => (i + 1) % results.length);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIdx((i) => (i - 1 + results.length) % results.length);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const hit = results[activeIdx] ?? results[0];
                        if (hit) goTo(hit.href);
                      } else if (e.key === "Escape") {
                        setOpen(false);
                      }
                    }}
                  />
                  {open ? (
                    <div className="absolute top-11 z-20 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                      <ul className="max-h-80 overflow-y-auto py-1">
                        {results.map((item, idx) => (
                          <li key={item.href}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted",
                                idx === activeIdx && "bg-muted"
                              )}
                              onMouseEnter={() => setActiveIdx(idx)}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                goTo(item.href);
                              }}
                            >
                              <span className="truncate">{item.title}</span>
                              <span className="ml-3 shrink-0 text-xs text-muted-foreground">{item.href}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="pointer-events-none relative z-10 flex h-full items-center justify-end px-3 sm:px-4">
              <div className="pointer-events-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
        ) : null}
        <AppHeader />
        <div
          data-app-scroll="true"
          className="min-h-0 flex-1 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-y-contain"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
