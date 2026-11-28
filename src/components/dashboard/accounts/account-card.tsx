"use client";

import { ExternalLink, Eye, EyeOff, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { AccountLogo } from "@/components/dashboard/accounts/account-logo";
import { ACCOUNT_CARD_TAG_LIMIT, CASH_BANK_NAME } from "@/lib/constants/accounts";
import { AMOUNT_MASK } from "@/lib/constants/dashboard";
import { accountStanding, type AccountRow, type AccountStanding } from "@/lib/shared/accounts";
import { cn, formatCurrency } from "@/lib/utils";

/** The meter and one line under it: credit used against the limit, or the balance against the minimum. */
function StandingMeter({
  standing,
  currency,
  hideAmounts,
}: {
  standing: AccountStanding;
  currency: string;
  hideAmounts: boolean;
}) {
  if (standing.kind === "credit") {
    const pct = Math.round(standing.ratio * 100);
    return (
      <div className="space-y-1.5">
        <Progress
          value={standing.ratio * 100}
          barClassName={standing.overLimit ? "bg-destructive" : "bg-muted-foreground"}
          label={`${pct}% of the credit limit used`}
        />
        {standing.overLimit ? (
          <p className="text-xs text-destructive">
            {hideAmounts
              ? "Over the limit"
              : `Over the limit by ${formatCurrency(standing.used - standing.limit, currency)}`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {pct}% used
            {!hideAmounts && (
              <>
                {" "}
                <span aria-hidden>•</span> {formatCurrency(standing.left, currency)} left
              </>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Progress
        value={standing.ratio * 100}
        barClassName={standing.below ? "bg-warning" : undefined}
        label={standing.below ? "Below the maintaining balance" : "Above the maintaining balance"}
      />
      {standing.below ? (
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-xs text-warning">
            {hideAmounts
              ? "Below the minimum"
              : `${formatCurrency(standing.shortBy, currency)} short of ${formatCurrency(standing.minimum, currency)}`}
          </p>
          <Stamp variant="due">Below min</Stamp>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hideAmounts ? "Above the minimum" : `Above the ${formatCurrency(standing.minimum, currency)} minimum`}
        </p>
      )}
    </div>
  );
}

/**
 * One account: its logo tile, name and type, how it sits against its limit or
 * minimum, and its balance. The whole card opens the account; the menu sits above
 * that. An account left out of the Net Balance is drawn with a dashed outline.
 */
export function AccountCard({
  account,
  balance,
  hideAmounts,
  loading,
  onOpen,
  onEdit,
  onToggleTracked,
  onDelete,
}: {
  account: AccountRow;
  balance: number;
  hideAmounts: boolean;
  /** The account's page is loading after a tap on this card. */
  loading: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleTracked: () => void;
  onDelete: () => void;
}) {
  const isCash = account.bank_name === CASH_BANK_NAME;
  const tracked = account.include_in_net_balance;
  const standing = accountStanding(account, balance);
  const belowMinimum = standing?.kind === "minimum" && standing.below;
  const earnsInterest = account.interest_rate != null && account.interest_rate > 0;
  const tags = account.tags
    .filter((tag) => !(isCash && tag === CASH_BANK_NAME))
    .slice(0, ACCOUNT_CARD_TAG_LIMIT);

  return (
    <article
      className={cn(
        "group surface relative flex min-h-[11.5rem] min-w-0 flex-col gap-2.5 border p-3.5 transition-colors @container hover:border-primary/40 sm:p-4",
        tracked ? "border-border bg-card" : "border-dashed border-hairline-strong bg-background",
        belowMinimum && "border-warning/70 hover:border-warning",
      )}
    >
      {/* A narrow card (two to a row on a phone) puts the logo and menu on one row and the
          name underneath. From 200px wide, the name sits between them. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-2">
        <AccountLogo account={account} className="pointer-events-none col-start-1 row-start-1" />
        <div className="col-span-3 row-start-2 min-w-0 @[200px]:col-span-1 @[200px]:col-start-2 @[200px]:row-start-1">
          <h3 className="text-sm font-semibold leading-5">
            {/* Stretched over the whole card, so anywhere on it opens the account. The
                button is not positioned, so its own truncation does not clip the overlay. */}
            <button
              type="button"
              onClick={onOpen}
              className="block w-full truncate text-left outline-none after:absolute after:inset-0 after:rounded-[0.875rem] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {account.account_alias}
            </button>
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {!isCash && (
              <>
                <span className="capitalize">{account.account_type}</span> <span aria-hidden>•</span>{" "}
              </>
            )}
            {account.currency}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="tap-target relative z-10 col-start-3 row-start-1 -mr-1.5 -mt-1 text-muted-foreground hover:text-foreground disabled:opacity-100"
              aria-label={loading ? `Opening ${account.account_alias}…` : `Options for ${account.account_alias}`}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" aria-hidden /> : <MoreVertical aria-hidden />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onSelect={onOpen}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open account
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            {!isCash && (
              <>
                <DropdownMenuItem className="cursor-pointer" onSelect={onToggleTracked}>
                  {tracked ? (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden />
                      Mark as untracked
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden />
                      Mark as tracked
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onDelete}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {standing && <StandingMeter standing={standing} currency={account.currency} hideAmounts={hideAmounts} />}

      {earnsInterest && (
        <p className="text-xs text-muted-foreground">
          Earns {account.interest_rate}% interest
          {account.interest_frequency && (
            <>
              {" "}
              <span aria-hidden>•</span> {account.interest_frequency}
            </>
          )}
        </p>
      )}

      {(!tracked || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!tracked && <Stamp variant="muted">Untracked</Stamp>}
          {tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-full border border-border px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="fit-figure mt-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Balance</p>
        {hideAmounts ? (
          <p className="figure text-lg sm:text-xl">{AMOUNT_MASK}</p>
        ) : (
          <Amount
            value={balance}
            currency={account.currency}
            className={cn(
              "text-lg sm:text-xl",
              balance < 0 ? "text-destructive" : !tracked && "text-muted-foreground",
            )}
          />
        )}
      </div>
    </article>
  );
}
