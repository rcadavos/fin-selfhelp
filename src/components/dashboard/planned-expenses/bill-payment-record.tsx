import { Amount } from "@/components/passbook/amount";
import { paidMonthName } from "@/lib/paid-month";
import { BILL_RECORD_BAR_PX, BILL_RECORD_STYLE } from "@/lib/constants/planned-expenses";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  BillHistorySummary,
  BillRecordMonth,
  BillRecordStatus,
} from "@/lib/planned-expenses/bill-history";

/** Legend order; "none" is left out, an empty month needs no key. */
const LEGEND_ORDER: BillRecordStatus[] = ["paid", "partial", "carried", "missed", "open"];

function monthYear(ym: string): string {
  return `${paidMonthName(ym)} ${ym.slice(0, 4)}`;
}

function describe(cell: BillRecordMonth, currency: string): string {
  const { label } = BILL_RECORD_STYLE[cell.status];
  if (cell.status === "paid" || cell.status === "partial") {
    return `${monthYear(cell.month)}: ${label}, ${formatCurrency(cell.paid, currency)} of ${formatCurrency(cell.due, currency)}`;
  }
  return `${monthYear(cell.month)}: ${label}`;
}

/**
 * The bill's last year as a row of tubes, one a month, filled by how much of that
 * month was paid, so a missed or part-paid month stands out against the rest. Under
 * it: what was paid this year, the usual payment, and how many months were paid in full.
 */
export function BillPaymentRecord({
  record,
  summary,
  currentMonth,
  currency,
  className,
}: {
  /** Oldest month first, ending with `currentMonth`. */
  record: BillRecordMonth[];
  summary: BillHistorySummary;
  currentMonth: string;
  currency: string;
  className?: string;
}) {
  const present = new Set(record.map((r) => r.status));
  const legend = LEGEND_ORDER.filter((s) => present.has(s));

  return (
    <section
      aria-labelledby="bill-record-heading"
      className={cn("surface border border-border bg-card p-4 shadow-[var(--shadow)] sm:p-5", className)}
    >
      <h2 id="bill-record-heading" className="text-[13.5px] font-semibold">
        Last {record.length} months
      </h2>

      <div
        role="img"
        aria-label={record.map((r) => describe(r, currency)).join(". ")}
        className="mt-4 flex items-end gap-1 sm:gap-2"
      >
        {record.map((cell) => {
          const style = BILL_RECORD_STYLE[cell.status];
          const isCurrent = cell.month === currentMonth;
          const short = paidMonthName(cell.month, "short");
          return (
            <div
              key={cell.month}
              title={describe(cell, currency)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={cn("relative block w-full max-w-[28px] overflow-hidden rounded-[6px]", style.track)}
                style={{ height: BILL_RECORD_BAR_PX }}
              >
                {style.fill && cell.share > 0 && (
                  <span
                    className={cn("absolute inset-x-0 bottom-0 transition-[height] duration-500", style.fill)}
                    style={{ height: `${Math.max(8, cell.share * 100)}%` }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] leading-none",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="sm:hidden">{short.charAt(0)}</span>
                <span className="hidden sm:inline">{short}</span>
              </span>
            </div>
          );
        })}
      </div>

      {legend.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11.5px] text-muted-foreground">
          {legend.map((status) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "relative inline-block size-2.5 overflow-hidden rounded-[3px]",
                  BILL_RECORD_STYLE[status].fill || BILL_RECORD_STYLE[status].track,
                )}
              />
              {BILL_RECORD_STYLE[status].label}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <div className="fit-figure min-w-0">
          <dt className="text-[11.5px] text-muted-foreground">Paid in {summary.year}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold">
            <Amount value={summary.paidInYear} currency={currency} />
          </dd>
        </div>
        <div className="fit-figure min-w-0">
          <dt className="text-[11.5px] text-muted-foreground">Average payment</dt>
          <dd className="mt-0.5 text-[15px] font-semibold">
            {summary.averagePayment !== null ? (
              <Amount value={summary.averagePayment} currency={currency} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11.5px] text-muted-foreground">Paid in full</dt>
          <dd className="mt-0.5 text-[15px] font-semibold">
            {summary.monthsDue > 0 ? (
              <>
                {summary.paidInFull}
                <span className="text-[12px] font-normal text-muted-foreground"> of {summary.monthsDue} months</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
