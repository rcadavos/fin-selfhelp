import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/passbook/amount";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { reminderLabelFor } from "@/components/dashboard/planned-expenses/expense-row";
import { billDueLabel } from "@/lib/planned-expenses/bill-history";
import { BILL_PERIOD_LABELS } from "@/lib/constants/planned-expenses";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import { cn } from "@/lib/utils";
import type { AccountRow } from "@/actions/accounts";
import type { BillRow } from "@/actions/bills";
import type { VehicleRow } from "@/actions/vehicles";

function longDate(ymd: string): string {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/** The bill's own settings as a ledger, with its notes underneath. */
export function BillDetailsCard({
  bill,
  categoryLabel,
  account,
  showAccount,
  vehicle,
  vehicleColor,
  autoDebitRuns,
  currency,
  onEdit,
  className,
}: {
  bill: BillRow;
  categoryLabel: string;
  account: AccountRow | null;
  /** Accounts are off in bills mode: the link would lead to a page that mode blocks. */
  showAccount: boolean;
  vehicle: VehicleRow | null;
  vehicleColor: string | null;
  /** Auto-debit is on for the bill and the app mode lets it run. */
  autoDebitRuns: boolean;
  currency: string;
  onEdit: () => void;
  className?: string;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Amount", value: <Amount value={bill.amount} currency={currency} /> },
    { label: "Category", value: categoryLabel },
    { label: "Repeats", value: BILL_PERIOD_LABELS[bill.billing_period] },
    { label: "Due", value: billDueLabel(bill) },
    { label: "Ends", value: bill.end_date ? longDate(bill.end_date) : null },
    ...(showAccount
      ? [
          {
            label: "Paid from",
            value: account ? (
              <Link
                href={`/dashboard/accounts/${account.id}`}
                className="inline-flex max-w-full items-center gap-1.5 hover:underline"
              >
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                <span className="truncate">{account.account_alias}</span>
              </Link>
            ) : (
              <span className="font-normal text-muted-foreground">Not linked</span>
            ),
          },
        ]
      : []),
    {
      label: "Vehicle",
      value: vehicle ? (
        <span className="inline-flex max-w-full items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: vehicleColor ?? undefined }} />
          <span className="truncate">
            {vehicle.name}
            {bill.vehicle_category && (
              <span className="font-normal text-muted-foreground">
                {" "}
                • {labelForVehicleExpenseCategory(bill.vehicle_category)}
              </span>
            )}
          </span>
        </span>
      ) : null,
    },
    {
      label: "Reminders",
      value: reminderLabelFor(bill.reminder_days_before) ?? (
        <span className="font-normal text-muted-foreground">Off</span>
      ),
    },
    { label: "Auto-debit", value: bill.is_auto_debit ? (autoDebitRuns ? "On" : "Paused") : null },
    {
      label: "Added",
      value: new Date(bill.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long" }),
    },
  ].filter((row) => row.value != null && row.value !== "");

  const notes = bill.notes?.trim();

  return (
    <section
      aria-labelledby="bill-details-heading"
      className={cn("surface border border-border bg-card px-4 pb-4 pt-3 shadow-[var(--shadow)]", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="bill-details-heading" className="text-[13.5px] font-semibold">
          Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onEdit} className="-mr-2 gap-1.5 text-primary hover:text-primary">
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </div>

      <ul className="mt-1.5 space-y-1.5 text-[13px]">
        {rows.map((row) => (
          <li key={row.label}>
            <LedgerRow label={<span className="text-muted-foreground">{row.label}</span>}>
              <span className="min-w-0 truncate text-right font-medium">{row.value}</span>
            </LedgerRow>
          </li>
        ))}
      </ul>

      {bill.is_auto_debit && (
        <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
          {autoDebitRuns
            ? "Paid automatically from its account on each due date."
            : "Auto-debit is still on for this bill, but it is paused in Bills & reminders mode, so mark it paid yourself. Turn Full cashflow back on in Settings to resume it."}
        </p>
      )}

      {notes && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11.5px] font-medium text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-relaxed">{notes}</p>
        </div>
      )}
    </section>
  );
}
