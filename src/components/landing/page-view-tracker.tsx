"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `pv_${pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/track?path=${encodeURIComponent(pathname)}`, { method: "POST" }).catch(() => {});
  }, [pathname]);

  return null;
}
