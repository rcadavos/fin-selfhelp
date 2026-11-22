"use client";

import { ChevronDown } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { cn } from "@/lib/utils";
import { URGENCY_TONE } from "@/lib/constants/planned-expenses";
import type { UrgencyBucket } from "@/lib/planned-expenses/grouping";

/**
 * One urgency bucket: a heading that carries its own count and subtotal, then the
 * rows. The old list sorted by the same logic but rendered no headings, so the
 * ordering looked arbitrary — the headings are that logic made visible.
 */
export function ExpenseGroup({
  bucket,
  label,
  count,
  subtotal,
  currency,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  children,
}: {
  bucket: UrgencyBucket;
  label: string;
  count: number;
  subtotal: number;
  currency: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  children: React.ReactNode;
}) {
  const heading = (
    <>
      <span className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.1em]", URGENCY_TONE[bucket])}>
        {label}
        <span className="ml-1.5 font-normal opacity-55">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </span>
      <DotLeader />
      <Amount value={subtotal} currency={currency} className="pb-px text-[12.5px]" />
      {collapsible && (
        <ChevronDown
          className={cn(
            "ml-1.5 size-3.5 shrink-0 self-center text-muted-foreground transition-transform",
            !collapsed && "rotate-180",
          )}
          aria-hidden
        />
      )}
    </>
  );

  // Inside a wide ledger (`@2xl`, see BillsLedger) the groups share one card: each
  // heading becomes a row of that card and the per-group card loses its own frame.
  const headingLayout = "flex items-baseline pb-2 @2xl:px-4 @2xl:pt-4";

  return (
    <section className="flex flex-col @2xl:border-t @2xl:border-border @2xl:first:border-t-0">
      {collapsible ? (
        <button
          type="button"
          className={cn(headingLayout, "text-left transition-opacity hover:opacity-75")}
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          {heading}
        </button>
      ) : (
        <div className={headingLayout}>{heading}</div>
      )}

      {!collapsed && (
        <div className="surface overflow-hidden border border-border bg-card @2xl:rounded-none @2xl:border-x-0 @2xl:border-b-0 @2xl:bg-transparent">
          <div className="divide-y divide-border">{children}</div>
        </div>
      )}
    </section>
  );
}
