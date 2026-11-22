import Image from "next/image";
import { cn } from "@/lib/utils";
import { OTTO_FACE_TILT_DEG, ottoSrc } from "@/lib/constants/mascot";

type SiteLogoProps = {
  /** Wrapper classes — control gap, color, and text size (defaults to text-lg). */
  className?: string;
  /** Icon box classes (defaults to h-10). */
  iconClassName?: string;
  /** Render the mark only, no wordmark. */
  iconOnly?: boolean;
  /** Set `high` for above-the-fold logo (LCP / Lighthouse fetch priority). */
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * OmniTrak lockup: Otto's head, tilted a little like a curious owl (`public/mascot/otto-face.svg`, drawn by
 * `npm run mascot:draw`), beside the "OmniTrak" wordmark set in the app font (Schibsted Grotesk).
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
        "inline-flex items-center gap-2 text-2xl font-bold leading-none tracking-tight text-primary",
        className,
      )}
    >
      <Image
        src={ottoSrc("otto-face.svg")}
        alt={iconOnly ? "OmniTrak" : ""}
        aria-hidden={iconOnly ? undefined : true}
        width={80}
        height={80}
        className={cn("h-10 w-auto shrink-0 object-contain", iconClassName)}
        style={{ transform: `rotate(${OTTO_FACE_TILT_DEG}deg)` }}
        priority={fetchPriority === "high"}
        fetchPriority={fetchPriority}
        decoding="async"
        unoptimized
      />
      {!iconOnly && <span>OmniTrak</span>}
    </span>
  );
}
