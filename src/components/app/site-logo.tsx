"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
};

/** Banner wordmark — `public/omnitrak-logo.png` (top headers). */
export function SiteLogo({ className }: SiteLogoProps) {
  return (
    <Image
      src="/omnitrak-logo.png"
      alt=""
      width={200}
      height={40}
      className={cn("h-9 w-auto max-h-9 object-contain object-left", className)}
      sizes="(max-width: 640px) 160px, 200px"
      priority
    />
  );
}
