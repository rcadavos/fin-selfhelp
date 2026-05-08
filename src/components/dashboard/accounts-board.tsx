"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import {
  useTooltip,
  useTooltipInPortal,
  defaultStyles as defaultTooltipStyles,
} from "@visx/tooltip";
import { max } from "d3-array";
import Image from "next/image";
import { Wallet, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
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

const tooltipStyles = {
  ...defaultTooltipStyles,
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

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
}: {
  width: number;
  height: number;
  series: NetBalancePoint[];
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

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

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
    <div ref={containerRef} style={{ position: "relative", width, height }}>
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
                    tooltipTop: barTop + margin.top - 8,
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
            tickFormat={(v) => formatCurrency(Number(v))}
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
        <TooltipInPortal top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
          <div className="font-medium">{formatChartTick(parseDate(tooltipData.date))}</div>
          <div className="tabular-nums">{formatCurrency(getY(tooltipData))}</div>
        </TooltipInPortal>
      )}
    </div>
  );
}

function NetBalanceBarChart({ series }: { series: NetBalancePoint[] }) {
  return (
    <div style={{ height: 200 }}>
      <ParentSize>
        {({ width, height }) => (
          <NetBalanceBarChartInner width={width} height={height} series={series} />
        )}
      </ParentSize>
    </div>
  );
}

// ─── Account card ────────────────────────────────────────────────────────────

function AccountCard({
  account,
  balance,
  onOpen,
  onEdit,
  onDelete,
}: {
  account: AccountRow;
  balance: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
        {/* Action buttons — hidden for the system Cash account */}
        {account.bank_name !== "Cash" && (
          <div className="absolute right-0 top-0 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="icon" variant="ghost" className="h-6 w-6 text-black hover:text-foreground" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Edit account" >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-800 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete account" >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

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
                balance < 0 && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatCurrency(balance, account.currency)}
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

  const [addOpen, setAddOpen] = useState(false);
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
          <Button size="sm" className="gap-1.5" onClick={() => { setFormError(null); setAddOpen(true); }}>
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
            <p className={
              netBalance < 0
                ? "mt-0.5 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400"
                : "mt-0.5 text-lg font-bold tabular-nums"
            }>{formatCurrency(netBalance)}</p>
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
                <NetBalanceBarChart series={netHistory} />
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
          <Button size="sm" variant="outline" onClick={() => { setFormError(null); setAddOpen(true); }}>
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
              onOpen={() => router.push(`/dashboard/accounts/${acc.id}`)}
              onEdit={() => { setFormError(null); setEditingAccount(acc); }}
              onDelete={() => setDeletingId(acc.id)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AccountFormDialog
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
