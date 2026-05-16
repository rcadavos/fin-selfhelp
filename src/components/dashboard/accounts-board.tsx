"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { useTooltip } from "@visx/tooltip";
import { max } from "d3-array";
import Image from "next/image";
import { Wallet, Plus, AlertTriangle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { getBankLogoSlug } from "@/lib/constants/account-institutions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentHeader } from "@/components/app/content-header";
import { formatCurrency, cn } from "@/lib/utils";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  netBalanceHistoryQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  type AccountRow,
} from "@/actions/accounts";
import {
  AccountFormDialog,
  accountToForm,
  accountFormToInput,
  type AccountFormState,
} from "@/components/dashboard/account-form-dialog";

// ─── Net balance bar chart (visx) ────────────────────────────────────────────

type NetBalancePoint = { date: string; balance: number };

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function formatChartTick(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const getY = (d: NetBalancePoint) => d.balance;


// rounded-top rect path (SVG path string)
function roundedTopPath(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const radius = Math.min(r, w / 2, h);
  return [
    `M${x + radius},${y}`,
    `h${w - radius * 2}`,
    `a${radius},${radius} 0 0 1 ${radius},${radius}`,
    `v${h - radius}`,
    `h${-w}`,
    `v${-(h - radius)}`,
    `a${radius},${radius} 0 0 1 ${radius},${-radius}`,
    "z",
  ].join(" ");
}


function NetBalanceBarChartInner({
  width,
  height,
  series,
  hideAmounts,
}: {
  width: number;
  height: number;
  series: NetBalancePoint[];
  hideAmounts: boolean;
}) {
  const margin = { top: 10, right: 16, bottom: 28, left: 56 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
  } = useTooltip<NetBalancePoint>();

  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: series.map((d) => d.date),
        range: [0, innerWidth],
        padding: 0.3,
      }),
    [series, innerWidth],
  );

  const yScale = useMemo(() => {
    const maxY = max(series, getY) ?? 0;
    const pad = Math.max(1, maxY * 0.15);
    return scaleLinear({
      domain: [0, Math.max(500, maxY + pad)],
      range: [innerHeight, 0],
      nice: true,
    });
  }, [series, innerHeight]);

  const bw = xScale.bandwidth();

  if (width < 10 || height < 10) return null;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="nbg-pos" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.65} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
          </linearGradient>
        </defs>

        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            numTicks={4}
          />

          {/* bars */}
          {series.map((d) => {
            const bx = xScale(d.date) ?? 0;
            const balance = Math.max(0, d.balance);
            const barTop = yScale(balance);
            const barH = innerHeight - barTop;
            const isHovered = tooltipData?.date === d.date;

            return (
              <g
                key={d.date}
                onMouseEnter={() =>
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: bx + bw / 2 + margin.left,
                    tooltipTop: margin.top + 8,
                  })
                }
                onMouseLeave={hideTooltip}
                style={{ cursor: "default" }}
              >
                {/* column hover highlight */}
                <rect
                  x={bx - 3}
                  y={0}
                  width={bw + 6}
                  height={innerHeight}
                  fill={isHovered ? "hsl(var(--muted))" : "transparent"}
                  rx={5}
                  opacity={0.6}
                />

                {barH > 1 ? (
                  <path
                    d={roundedTopPath(bx, barTop, bw, barH, 5)}
                    fill="url(#nbg-pos)"
                    opacity={isHovered ? 1 : 0.84}
                    style={{ transition: "opacity 0.1s ease" }}
                  />
                ) : (
                  <rect
                    x={bx}
                    y={innerHeight - 1}
                    width={bw}
                    height={2}
                    fill="hsl(var(--muted-foreground))"
                    rx={1}
                  />
                )}
              </g>
            );
          })}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickFormat={(v) => formatChartTick(parseDate(String(v)))}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "middle",
              dy: "0.6em",
            })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={4}
            tickFormat={(v) => hideAmounts ? "•••" : formatCurrency(Number(v))}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "end",
              dx: "-0.25em",
              dy: "0.25em",
            })}
          />
        </Group>
      </svg>

      {tooltipData && (
        <div
          style={{
            position: "absolute",
            top: tooltipTop,
            left: tooltipLeft,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            whiteSpace: "nowrap",
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{formatChartTick(parseDate(tooltipData.date))}</div>
          <div style={{ fontVariantNumeric: "tabular-nums" }}>{hideAmounts ? "••••••" : formatCurrency(getY(tooltipData))}</div>
        </div>
      )}
    </div>
  );
}

function NetBalanceBarChart({ series, hideAmounts }: { series: NetBalancePoint[]; hideAmounts: boolean }) {
  return (
    <div style={{ height: 200 }}>
      <ParentSize>
        {({ width, height }) => (
          <NetBalanceBarChartInner width={width} height={height} series={series} hideAmounts={hideAmounts} />
        )}
      </ParentSize>
    </div>
  );
}

// ─── Account card ────────────────────────────────────────────────────────────

function AccountCard({
  account,
  balance,
  hideAmounts,
  onOpen,
}: {
  account: AccountRow;
  balance: number;
  hideAmounts: boolean;
  onOpen: () => void;
}) {
  const logoSlug = getBankLogoSlug(account.bank_name);

  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40"
      style={{ borderColor: `${account.color}66` }}
    >
      {/* Softer gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${account.color}40 30%, ${account.color}FF 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Go-to link icon */}
        <div className="absolute right-0 top-0 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-foreground/60 hover:text-foreground" onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label="Open account">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Header */}
        <div className="mb-2 flex min-w-0 items-center gap-2 pr-12">
          {logoSlug && (
            <Image
              src={`/images/bank-logo/${logoSlug}.webp`}
              alt={account.bank_name}
              width={24}
              height={24}
              className="flex-shrink-0 rounded-md object-contain"
            />
          )}

          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {account.account_alias}
          </p>
        </div>

        {/* Meta */}
        <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-foreground/75">
          {account.bank_name !== "Cash" && (
            <>
              <span className="capitalize">{account.account_type}</span>
              <span>•</span>
            </>
          )}
          <span>{account.currency}</span>
          {account.maintaining_balance != null && account.maintaining_balance > 0 && (
            <>
              <span>•</span>
              <span>Min: {hideAmounts ? "•••" : formatCurrency(account.maintaining_balance, account.currency)}</span>
            </>
          )}

          {!account.include_in_net_balance && (
            <span className="rounded-full border border-amber-500/40 bg-amber-50/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 backdrop-blur-sm dark:bg-amber-950/40 dark:text-amber-400">
              Untracked
            </span>
          )}

          {account.tags
            .filter((tag) => !(account.bank_name === "Cash" && tag === "Cash"))
            .slice(0, 2)
            .map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 backdrop-blur-sm"
                style={{ borderColor: `${account.color}40` }}
              >
                {tag}
              </span>
            ))}
        </div>

        {/* Balance */}
        <div className="mt-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
            Balance
          </p>

          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "text-lg font-bold tabular-nums text-foreground",
                balance < 0 && !hideAmounts && "text-rose-600 dark:text-rose-400",
              )}
            >
              {hideAmounts ? "••••••" : formatCurrency(balance, account.currency)}
            </p>
            {account.maintaining_balance != null &&
              account.maintaining_balance > 0 &&
              balance < account.maintaining_balance && (
                <AlertTriangle
                  className="h-4 w-4 flex-shrink-0 text-amber-500"
                  aria-label="Balance below maintaining balance"
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function AccountsBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: balances = {} } = useQuery(accountBalancesQueryOptions());
  const { data: netHistory = [] } = useQuery(netBalanceHistoryQueryOptions(7));

  const netBalance = useMemo(
    () =>
      accounts
        .filter((a: AccountRow) => a.include_in_net_balance)
        .reduce((s: number, acc: AccountRow) => s + (balances[acc.id] ?? 0), 0),
    [accounts, balances],
  );

  const includedCount = useMemo(
    () => accounts.filter((a: AccountRow) => a.include_in_net_balance).length,
    [accounts],
  );

  const hasAnyAccount = accounts.length > 0;

  const sortedAccounts = useMemo(
    () =>
      [...accounts].sort((a: AccountRow, b: AccountRow) => {
        const aIsCash = a.account_alias.toLowerCase() === "cash";
        const bIsCash = b.account_alias.toLowerCase() === "cash";
        if (aIsCash) return -1;
        if (bIsCash) return 1;
        return 0;
      }),
    [accounts],
  );

  const [amountsHidden, setAmountsHidden] = useState(false);
  useEffect(() => {
    setAmountsHidden(localStorage.getItem("omnitrak-amounts-hidden") === "1");
  }, []);

  function toggleAmountsHidden() {
    setAmountsHidden((prev) => {
      const next = !prev;
      localStorage.setItem("omnitrak-amounts-hidden", next ? "1" : "0");
      return next;
    });
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    invalidateAccountQueries(queryClient);
  }, [queryClient]);

  function handleAdd(form: AccountFormState) {
    setFormError(null);
    startTransition(async () => {
      const res = await createAccount(accountFormToInput(form));
      if (res.error) { setFormError(res.error); return; }
      setAddOpen(false);
      invalidate();
    });
  }

  function handleEdit(form: AccountFormState) {
    if (!editingAccount) return;
    setFormError(null);
    startTransition(async () => {
      const res = await updateAccount(editingAccount.id, accountFormToInput(form));
      if (res.error) { setFormError(res.error); return; }
      setEditingAccount(null);
      invalidate();
    });
  }

  function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteAccount(deletingId);
      setDeletingId(null);
      invalidate();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <ContentHeader
        title="Accounts"
        icon={Wallet}
        subtitle="Your accounts hub — record expenses, income, transfers, and adjustments here. This isn&apos;t linked to your real bank or e-wallet."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormError(null); setAddKey(k => k + 1); setAddOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {/* Summary: stats + bar chart */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Stat cards */}
        <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Accounts</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{accounts.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {accounts.length === 1 ? "Account" : "Accounts"} added
            </p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Net Balance</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className={
                netBalance < 0 && !amountsHidden
                  ? "text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400"
                  : "text-lg font-bold tabular-nums"
              }>{amountsHidden ? "••••••" : formatCurrency(netBalance)}</p>
              <button
                onClick={toggleAmountsHidden}
                className="pt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
              >
                {amountsHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {includedCount} of {accounts.length} {accounts.length === 1 ? "account" : "accounts"} included
            </p>
          </div>
        </div>

        {/* 7-day net balance bar chart */}
        <div className="sm:w-2/3">
          {hasAnyAccount ? (
            <Card className="h-full">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Net Balance — last 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <NetBalanceBarChart series={netHistory} hideAmounts={amountsHidden} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add an account to see the chart
            </div>
          )}
        </div>
      </div>

      {/* Accounts grid */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-muted-foreground">
          <p className="text-sm">No accounts yet. Add one to start tracking by account.</p>
          <Button size="sm" variant="outline" onClick={() => { setFormError(null); setAddKey(k => k + 1); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {sortedAccounts.map((acc: AccountRow) => (
            <AccountCard
              key={acc.id}
              account={acc}
              balance={balances[acc.id] ?? 0}
              hideAmounts={amountsHidden}
              onOpen={() => router.push(`/dashboard/accounts/${acc.id}`)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AccountFormDialog
        key={addKey}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        isPending={isPending}
        error={formError}
      />

      {/* Edit dialog */}
      {editingAccount && (
        <AccountFormDialog
          open={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleEdit}
          initial={accountToForm(editingAccount)}
          isPending={isPending}
          error={formError}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The account will be removed. Expenses and bills tagged to it will be unlinked but not deleted.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => setDeletingId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" className="w-1/2" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
