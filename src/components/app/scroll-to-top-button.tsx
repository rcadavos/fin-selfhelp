"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 320;

function getMainScrollEl(): HTMLElement | null {
  return document.querySelector('[data-app-scroll="true"]');
}

function currentScrollTop(): number {
  const shell = getMainScrollEl();
  const yShell = shell?.scrollTop ?? 0;
  const yWin = typeof window !== "undefined" ? window.scrollY || document.documentElement.scrollTop : 0;
  return Math.max(yShell, yWin);
}

function scrollBothToTop(): void {
  const shell = getMainScrollEl();
  shell?.scrollTo({ top: 0, behavior: "smooth" });
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
    const shell = getMainScrollEl();
    shell?.addEventListener("scroll", onScroll, { passive: true });
    const t = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      shell?.removeEventListener("scroll", onScroll);
    };
  }, [pathname, update]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label="Back to top"
      title="Back to top"
      onClick={scrollBothToTop}
      className={cn(
        "fixed bottom-6 end-6 z-40 h-11 w-11 rounded-full border bg-background/95 shadow-md backdrop-blur-sm transition-opacity duration-200 supports-[backdrop-filter]:bg-background/80",
        "hover:bg-muted",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <ChevronUp className="h-5 w-5" aria-hidden />
    </Button>
  );
}
