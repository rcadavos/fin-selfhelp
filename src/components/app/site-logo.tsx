"use client";

import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
};

/** Banner wordmark — `public/omnitrak-logo.png` (top headers). */
export function SiteLogo({ className }: SiteLogoProps) {
  const logoSrc = "/omnitrak-logo.png?v=20260414";
  return (
    <img
      src={logoSrc}
      alt=""
      className={cn("h-9 w-auto max-h-9 object-contain object-left", className)}
      width={200}
      height={40}
      decoding="async"
    />
  );
}
