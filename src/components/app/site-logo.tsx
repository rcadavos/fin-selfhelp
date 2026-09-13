import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  /** Wrapper classes — control gap, color, and text size (defaults to text-lg). */
  className?: string;
  /** Icon box classes (defaults to h-7 w-7). */
  iconClassName?: string;
  /** Render the mark only, no wordmark. */
  iconOnly?: boolean;
  /** Set `high` for above-the-fold logo (LCP / Lighthouse fetch priority). */
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * OmniTrak lockup: the chameleon mark (`public/favicon.png`) + the "OmniTrak"
 * wordmark set in the app font (Schibsted Grotesk). Replaces the old baked
 * `omnitrak-logo.png` image so the wordmark always matches the product type.
 */
export function SiteLogo({
  className,
  iconClassName,
  iconOnly = false,
  fetchPriority = "auto",
}: SiteLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-2xl font-bold leading-none tracking-tight text-primary",
        className,
      )}
    >
      <Image
        src="/favicon.png"
        alt={iconOnly ? "OmniTrak" : ""}
        aria-hidden={iconOnly ? undefined : true}
        width={80}
        height={80}
        className={cn("h-10 w-auto shrink-0 object-contain", iconClassName)}
        priority={fetchPriority === "high"}
        fetchPriority={fetchPriority}
        decoding="async"
        unoptimized
      />
      {/* The lockup sets no gap — the space came from the transparent padding
          baked into favicon.png, so it takes a negative margin to close rather
          than a smaller gap. One value here covers the landing header, the app
          header and the sidebar. */}
      {!iconOnly && <span className="-ml-1.5">OmniTrak</span>}
    </span>
  );
}
