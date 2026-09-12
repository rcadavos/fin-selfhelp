"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ContentHeaderProps = {
  title: ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
};

export function ContentHeader({ title, subtitle, icon: Icon, actions, className }: ContentHeaderProps) {
  return (
    <header className={cn("mb-4", className)}>
      {/* flex-wrap: actions are shrink-0 and the title truncates to nothing, so on a
          narrow screen wide actions would otherwise eat the title and still overflow.
          Wrapping is decided on hypothetical sizes, so they drop to their own line
          only when they genuinely don't fit — desktop is unaffected. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex min-w-0 items-center gap-2 text-2xl font-semibold tracking-tight">
          {Icon ? <Icon className="h-7 w-7 shrink-0 text-primary" aria-hidden /> : null}
          {typeof title === "string" ? <span className="min-w-0 truncate">{title}</span> : title}
        </h1>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {subtitle ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
