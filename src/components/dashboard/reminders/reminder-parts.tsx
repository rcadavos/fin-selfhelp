"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { REMINDER_CATEGORY_ICONS, REMINDER_FALLBACK_ICON, REMINDER_UPGRADE_HREF } from "@/lib/constants/reminders";
import type { ToBuyCategory } from "@/lib/to-buy-storage";
import { cn } from "@/lib/utils";

/** Rounded square holding a reminder's category icon. */
export function ReminderCategoryTile({ category, className }: { category: ToBuyCategory; className?: string }) {
  const Icon = REMINDER_CATEGORY_ICONS[category] ?? REMINDER_FALLBACK_ICON;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-accent text-primary",
        className
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/** The round done/not-done toggle. Looks 22px; `tap-target` grows the touch area to 44px. */
export function ReminderCheckButton({
  checked,
  name,
  onClick,
  tone = "default",
  className,
}: {
  checked: boolean;
  name: string;
  onClick: () => void;
  tone?: "default" | "warning";
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark as not done: ${name}` : `Mark as done: ${name}`}
      onClick={onClick}
      className={cn(
        "tap-target flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : tone === "warning"
            ? "border-warning hover:bg-warning/10"
            : "border-muted-foreground/70 hover:border-primary",
        className
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}

/** A reminder past the free plan's limit: blurred, with a way to upgrade. */
export function ReminderLockedRow({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("relative flex min-h-12 items-center overflow-hidden", className)}>
      <span aria-hidden className="pointer-events-none select-none truncate pl-9 pr-16 text-[15px] opacity-60 blur-sm">
        {name}
      </span>
      <span className="sr-only">A reminder locked on the free plan.</span>
      <Link
        href={REMINDER_UPGRADE_HREF}
        className="absolute right-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-sm"
      >
        <Lock className="size-2.5" aria-hidden />
        Pro
      </Link>
    </div>
  );
}
