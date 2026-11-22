"use client";

import { useState } from "react";
import { CheckCheck, MousePointerClick } from "lucide-react";
import { cn, roundToCents } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { Stamp } from "@/components/passbook/stamp";
import { LedgerRow } from "@/components/passbook/dot-leader";
import {
  HERO_SAMPLE_BILLS,
  HERO_SAMPLE_MONTH,
  type HeroSampleBill,
} from "@/lib/constants/landing";

/**
 * The hero's sample bills ledger, and a live demo of the app's core action:
 * a visitor marks a due bill paid, the PAID stamp lands on it, and "Still to pay"
 * counts down. Clicking it again puts the bill back to due.
 */
export function HeroLedger() {
  const [markedPaid, setMarkedPaid] = useState<ReadonlySet<string>>(() => new Set());

  const stillToPay = roundToCents(
    HERO_SAMPLE_BILLS.filter((b) => b.status === "due" && !markedPaid.has(b.name)).reduce(
      (sum, b) => sum + b.amount,
      0
    )
  );
  const allPaid = stillToPay === 0;

  const toggle = (name: string) =>
    setMarkedPaid((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div
      className="surface border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-label="Sample upcoming bills ledger"
    >
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Upcoming bills
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{HERO_SAMPLE_MONTH.stamp}</span>
      </div>

      <ul>
        {HERO_SAMPLE_BILLS.map((bill) => (
          <li key={bill.name} className="border-b border-border">
            {bill.status === "due" ? (
              <button
                type="button"
                onClick={() => toggle(bill.name)}
                aria-pressed={markedPaid.has(bill.name)}
                aria-label={`Mark ${bill.name}, ${bill.display}, as paid`}
                className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <BillRow bill={bill} paid={markedPaid.has(bill.name)} justPaid />
              </button>
            ) : (
              <BillRow bill={bill} paid={bill.status === "paid"} />
            )}
          </li>
        ))}
      </ul>

      <LedgerRow
        label={<span className="text-sm font-bold">Still to pay</span>}
        className="mt-1 border-t border-hairline-strong pt-3"
      >
        <CountUpAmount value={stillToPay} currency="PHP" className="text-base font-bold" />
      </LedgerRow>

      <p
        className={cn(
          "mt-3.5 flex items-center gap-2 border-t border-border pt-3 text-xs",
          allPaid ? "font-medium text-primary" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {allPaid ? (
          <>
            <CheckCheck className="size-4 shrink-0" aria-hidden />
            All caught up for {HERO_SAMPLE_MONTH.name}.
          </>
        ) : (
          <>
            <MousePointerClick className="size-4 shrink-0" aria-hidden />
            Try it: mark a due bill as paid.
          </>
        )}
      </p>
    </div>
  );
}

function BillRow({
  bill,
  paid,
  justPaid = false,
}: {
  bill: HeroSampleBill;
  paid: boolean;
  /** Stamp lands with a press when the visitor marks it paid. */
  justPaid?: boolean;
}) {
  return (
    <LedgerRow
      label={
        <span className={cn("text-sm font-medium", paid && "text-muted-foreground line-through")}>
          {bill.name}
        </span>
      }
      className="py-2.5"
    >
      <Amount
        formatted={bill.display}
        className={cn("text-sm", paid && "text-muted-foreground line-through")}
      />
      {/* Fixed-width stamp column: amounts line up, and stay put when a stamp changes. */}
      <span className="ml-2.5 inline-flex w-[5.75rem] shrink-0 justify-end">
        {paid ? (
          <Stamp key="paid" variant="paid" className={cn(justPaid && "stamp-press")}>
            Paid
          </Stamp>
        ) : bill.status === "scheduled" ? (
          <Stamp key="scheduled" variant="scheduled">Scheduled</Stamp>
        ) : (
          <Stamp key="due" variant="due">Due {bill.due}</Stamp>
        )}
      </span>
    </LedgerRow>
  );
}
