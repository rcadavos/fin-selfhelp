import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OttoAnimated } from "./otto";
import { OttoSays } from "./otto-says";

type Pose = "idle" | "check" | "search" | "think" | "remind";

/**
 * Otto beside a page's title, at its right: his pose, and on wider screens a line he says. Hidden on phones, where
 * he would push the page's content down. Put it last in the title row (`flex justify-between`).
 */
export function OttoBeside({
  pose,
  size = 110,
  says,
  label,
  className,
}: {
  pose: Pose;
  size?: number;
  says?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("hidden shrink-0 items-center gap-1 sm:flex", className)}>
      {says ? <OttoSays className="hidden md:flex">{says}</OttoSays> : null}
      <OttoAnimated pose={pose} size={size} label={label} />
    </div>
  );
}
