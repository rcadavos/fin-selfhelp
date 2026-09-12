"use client";

import { useState } from "react";
import { ChevronDown, TriangleAlert, Check } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountCoverage } from "@/lib/planned-expenses/grouping";

/**
 * Whether each account can actually cover what it owes this month.
 *
 * `toggleBillPayment` already rejects with `insufficient_balance` — but only after
 * you tap Mark paid. The app knows the balance and the amount days earlier, so it
 * should say so days earlier.
 */
export function CoveragePanel({
  coverage,
  currency,
}: {
  coverage: AccountCoverage[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  if (coverage.length === 0) return null;

  const short = coverage.filter((c) => c.shortfall > 0);
  const isShort = short.length > 0;
  const headline = isShort
    ? short.length === 1
      ? "Covered overall — one account is short"
      : `${short.length} accounts are short`
    : "Every account covers what it owes";
  const detail = isShort
    ? `${short[0].alias} needs ${formatCurrency(short[0].shortfall, currency)} more`
    : `${coverage.length} account${coverage.length === 1 ? "" : "s"} with bills this month`;

  return (
    <div className="surface overflow-hidden border border-border bg-card shadow-[var(--shadow)]">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 p-3 text-left transition-colors hover:bg-accent/55"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={cn(
            "flex size-[22px] shrink-0 items-center justify-center rounded-full",
            isShort ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary",
          )}
          aria-hidden
        >
          {isShort ? <TriangleAlert className="size-3" /> : <Check className="size-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13.5px] font-semibold">{headline}</b>
          <small className="mt-px block text-xs text-muted-foreground">{detail}</small>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border px-3.5 pb-2.5 pt-1">
          {coverage.map((c) => (
            <div
              key={c.accountId ?? "unlinked"}
              className="flex items-baseline border-b border-border py-2 text-[13px] last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2 pb-0.5">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: c.color ?? "hsl(var(--hairline-strong))" }}
                  aria-hidden
                />
                <span className="truncate">{c.alias}</span>
              </span>
              <DotLeader />
              <span className="fit-figure shrink-0 pb-0.5 text-right text-[12.5px]">
                {c.accountId && (
                  <>
                    <Amount value={c.balance} currency={currency} />{" "}
                  </>
                )}
                <span className={cn("font-mono", c.shortfall > 0 ? "text-destructive" : "text-muted-foreground")}>
                  − {formatCurrency(c.due, currency)} due
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
