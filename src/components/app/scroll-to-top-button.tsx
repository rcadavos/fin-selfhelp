"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 320;

/** Primary scroll regions (AppShell main column, admin content, auth form columns, etc.). */
function getScrollRoots(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>('[data-app-scroll="true"]'));
}

function currentScrollTop(): number {
  let max = 0;
  if (typeof window !== "undefined") {
    const docEl = document.documentElement?.scrollTop ?? 0;
    const body = document.body?.scrollTop ?? 0;
    max = Math.max(max, window.scrollY, docEl, body);
  }
  for (const el of getScrollRoots()) {
    max = Math.max(max, el.scrollTop);
  }
  return max;
}

function scrollAllToTop(): void {
  for (const el of getScrollRoots()) {
    el.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function ScrollToTopButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    setVisible(currentScrollTop() > SCROLL_THRESHOLD_PX);
  }, []);

  useEffect(() => {
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const roots = getScrollRoots();
    roots.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));
    const t = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      roots.forEach((el) => el.removeEventListener("scroll", onScroll));
    };
  }, [pathname, update]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollAllToTop}
      className={cn(
        // border-hairline-strong, not a bare `border`: the Button base sets
        // border-transparent, and width/colour are separate classes, so `border`
        // alone survives the merge as a 1px *transparent* edge — invisible in
        // both themes. The token is legible on either ground by design.
        "fixed bottom-6 end-6 z-40 h-11 w-11 rounded-full border border-hairline-strong bg-background/95 shadow-lg backdrop-blur-sm transition-opacity duration-200 supports-[backdrop-filter]:bg-background/80",
        "hover:border-primary hover:bg-muted",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <ChevronUp className="h-5 w-5" aria-hidden />
    </Button>
  );
}
