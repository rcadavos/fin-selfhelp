import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import {
  PLANNED_EXPENSE_STAMP_VARIANT,
  PLANNED_EXPENSE_STATUS_LABEL,
} from "@/lib/constants/planned-expenses";
import type { PlannedExpenseRow } from "@/lib/planned-expenses/grouping";

/**
 * The bills falling on one day, for a day popover: name, status and what is owed.
 * The month calendar and the day-by-day runway both open it, so a day reads the
 * same wherever you point at it.
 */
export function DayBillsList({
  heading,
  rows,
  currency,
}: {
  heading: string;
  rows: PlannedExpenseRow[];
  currency: string;
}) {
  return (
    <>
      <p className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.bill.id} className="flex items-start justify-between gap-2 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{row.bill.note ?? "Bill"}</span>
              <Stamp variant={PLANNED_EXPENSE_STAMP_VARIANT[row.status]} className="mt-1">
                {PLANNED_EXPENSE_STATUS_LABEL[row.status]}
              </Stamp>
            </span>
            <Amount
              value={row.outstanding > 0 ? row.outstanding : row.amountDue}
              currency={currency}
              className="shrink-0 text-[13px]"
            />
          </li>
        ))}
      </ul>
    </>
  );
}
