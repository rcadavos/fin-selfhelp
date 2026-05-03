"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollFadeBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const check = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      setHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      mo.disconnect();
      ro.disconnect();
    };
  }, [check]);

  return (
    <>
      <div ref={ref} onScroll={check} className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none relative z-10 -mt-8 h-8 flex items-end justify-center pb-1 bg-gradient-to-t from-background/90 to-transparent transition-opacity duration-300",
          hasMore ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronDown className="h-4 w-4 animate-bounce text-muted-foreground/60" />
      </div>
    </>
  );
}
