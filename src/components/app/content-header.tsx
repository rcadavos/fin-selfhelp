"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ContentHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
};

export function ContentHeader({ title, subtitle, icon: Icon, actions, className }: ContentHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {Icon ? <Icon className="h-7 w-7 shrink-0 text-primary" aria-hidden /> : null}
          <span className="min-w-0 truncate">{title}</span>
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
