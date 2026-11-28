import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { ACCOUNT_GROUP_LABELS, ACCOUNT_MIX_SHADES } from "@/lib/constants/accounts";
import { AMOUNT_MASK } from "@/lib/constants/dashboard";
import type { AccountMix } from "@/lib/shared/accounts";
import { cn, formatCurrency } from "@/lib/utils";

function shadeAt(index: number): string {
  return ACCOUNT_MIX_SHADES[Math.min(index, ACCOUNT_MIX_SHADES.length - 1)];
}

function accountsLabel(count: number): string {
  return `${count} ${count === 1 ? "account" : "accounts"}`;
}

function shareLabel(share: number | null): string {
  if (share === null) return "";
  const pct = Math.round(share * 100);
  return pct < 1 ? "<1%" : `${pct}%`;
}

/** One line of the split: swatch, label, how many accounts, dot leader, total, share. */
function MixRow({
  swatchClassName,
  label,
  count,
  total,
  share,
  negative,
  amountsHidden,
}: {
  swatchClassName: string;
  label: string;
  count: number;
  total: number;
  share: number | null;
  negative: boolean;
  amountsHidden: boolean;
}) {
  return (
    <div className="flex items-baseline text-sm">
      <span aria-hidden className={cn("mr-2 size-2.5 shrink-0 self-center rounded-[3px]", swatchClassName)} />
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="ml-2 hidden shrink-0 text-xs text-muted-foreground @sm:inline">{accountsLabel(count)}</span>
      <DotLeader />
      {amountsHidden ? (
        <span className="figure shrink-0">{AMOUNT_MASK}</span>
      ) : (
        <Amount value={total} className={cn("shrink-0", negative && "text-destructive")} />
      )}
      <span className="figure w-10 shrink-0 text-right text-xs text-muted-foreground">{shareLabel(share)}</span>
    </div>
  );
}

/**
 * "Where your money sits": the accounts counted in the Net Balance as one bar split
 * by type, each type's total and share under it, then what sits outside the Net
 * Balance, which is credit owed and any untracked accounts.
 */
export function AccountMixCard({ mix, amountsHidden }: { mix: AccountMix; amountsHidden: boolean }) {
  const { groups, owedOnCredit, leftOut } = mix;
  // Groups come largest first, so the ones holding money lead and share the shade order.
  const held = groups.filter((g) => g.share !== null);

  return (
    <section
      aria-labelledby="accounts-mix"
      className="surface flex min-w-0 flex-col gap-4 border border-border bg-card p-4 @container sm:p-5"
    >
      <h2 id="accounts-mix" className="text-[13px] font-semibold text-muted-foreground">
        Where your money sits
      </h2>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">None of your accounts are counted in your net balance yet.</p>
      ) : (
        <>
          <div aria-hidden className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            {held.map((g, i) => (
              <span key={g.type} className={cn("min-w-1", shadeAt(i))} style={{ flex: `${g.share} 1 0%` }} />
            ))}
          </div>

          <ul className="space-y-2.5">
            {groups.map((g, i) => (
              <li key={g.type}>
                <MixRow
                  swatchClassName={
                    g.share !== null ? shadeAt(i) : g.total < 0 ? "border-2 border-destructive" : "bg-muted"
                  }
                  label={ACCOUNT_GROUP_LABELS[g.type]}
                  count={g.count}
                  total={g.total}
                  share={g.share}
                  negative={g.total < 0}
                  amountsHidden={amountsHidden}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {owedOnCredit.count > 0 && (
        <div className="border-t border-border pt-3.5">
          <MixRow
            swatchClassName="border-2 border-destructive"
            label="Owed on credit"
            count={owedOnCredit.count}
            total={-owedOnCredit.total}
            share={null}
            negative
            amountsHidden={amountsHidden}
          />
        </div>
      )}

      {(owedOnCredit.count > 0 || leftOut.count > 0) && (
        <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
          {owedOnCredit.count > 0 && "Credit is not counted in your net balance. "}
          {leftOut.count > 0 &&
            `${leftOut.count} untracked ${leftOut.count === 1 ? "account" : "accounts"}${
              amountsHidden ? "" : ` (${formatCurrency(leftOut.total)})`
            } ${leftOut.count === 1 ? "is" : "are"} left out.`}
        </p>
      )}
    </section>
  );
}
