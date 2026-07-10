import { cn } from "@/lib/utils";

/**
 * The dotted line that runs between a label and its amount — the receipt/passbook
 * idiom. Drop it between two flex children on a baseline-aligned row.
 * Style lives in globals.css (.dot-leader).
 */
export function DotLeader({ className }: { className?: string }) {
  return <span aria-hidden className={cn("dot-leader", className)} />;
}

/**
 * A single ledger row: label on the left, dot leader, amount (and optional trailing
 * node such as a Stamp) on the right. Baseline-aligned so the leader sits on the
 * text baseline. Compose with <Amount> and <Stamp>.
 */
export function LedgerRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-0.5", className)}>
      <span className="min-w-0 truncate">{label}</span>
      <DotLeader />
      {children}
    </div>
  );
}
