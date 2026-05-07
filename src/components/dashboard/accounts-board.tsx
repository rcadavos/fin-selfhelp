"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath, AreaClosed, Bar, Line as VisxLine, Circle } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import {
  useTooltip,
  useTooltipInPortal,
  defaultStyles as defaultTooltipStyles,
} from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { bisector, extent, max, min } from "d3-array";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
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

// ─── Net balance line chart (visx) ───────────────────────────────────────────

type NetBalancePoint = { date: string; balance: number };

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function formatChartTick(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const getX = (d: NetBalancePoint) => parseDate(d.date);
const getY = (d: NetBalancePoint) => d.balance;
const bisectDate = bisector<NetBalancePoint, Date>((d) => parseDate(d.date)).left;

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

function NetBalanceChartInner({
  width,
  height,
  series,
}: {
  width: number;
  height: number;
  series: NetBalancePoint[];
}) {
  const margin = { top: 10, right: 16, bottom: 24, left: 56 };
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

  const xScale = useMemo(() => {
    const domain = extent(series, getX) as [Date, Date];
    return scaleTime({
      domain: domain[0] && domain[1] ? domain : [new Date(), new Date()],
      range: [0, innerWidth],
    });
  }, [series, innerWidth]);

  const yScale = useMemo(() => {
    const minY = min(series, getY) ?? 0;
    const maxY = max(series, getY) ?? 0;
    const pad = Math.max(1, (maxY - minY) * 0.15);
    return scaleLinear({
      domain: [minY - pad, maxY + pad],
      range: [innerHeight, 0],
      nice: true,
    });
  }, [series, innerHeight]);

  const handleTooltip = useCallback(
    (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
      const point = localPoint(event) ?? { x: 0, y: 0 };
      const x0 = xScale.invert(point.x - margin.left);
      const idx = bisectDate(series, x0, 1);
      const d0 = series[idx - 1];
      const d1 = series[idx];
      let d = d0;
      if (d0 && d1) {
        d =
          x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf()
            ? d1
            : d0;
      }
      if (!d) return;
      showTooltip({
        tooltipData: d,
        tooltipLeft: xScale(getX(d)) + margin.left,
        tooltipTop: yScale(getY(d)) + margin.top,
      });
    },
    [series, xScale, yScale, margin.left, margin.top, showTooltip],
  );

  if (width < 10 || height < 10) return null;

  return (
    <div ref={containerRef} style={{ position: "relative", width, height }}>
      <svg width={width} height={height}>
        <LinearGradient
          id="net-balance-area"
          from="hsl(var(--primary))"
          fromOpacity={0.25}
          to="hsl(var(--primary))"
          toOpacity={0}
        />
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <AreaClosed<NetBalancePoint>
            data={series}
            x={(d) => xScale(getX(d))}
            y={(d) => yScale(getY(d))}
            yScale={yScale}
            fill="url(#net-balance-area)"
            curve={curveMonotoneX}
          />
          <LinePath<NetBalancePoint>
            data={series}
            x={(d) => xScale(getX(d))}
            y={(d) => yScale(getY(d))}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          {series.map((d) => (
            <Circle
              key={d.date}
              cx={xScale(getX(d))}
              cy={yScale(getY(d))}
              r={3}
              fill="hsl(var(--primary))"
            />
          ))}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={Math.min(series.length, 7)}
            tickFormat={(v) => formatChartTick(v as Date)}
            stroke="hsl(var(--muted-foreground))"
            tickStroke="hsl(var(--muted-foreground))"
            tickLabelProps={() => ({
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "middle",
              dy: "0.25em",
            })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={4}
            tickFormat={(v) => formatCurrency(Number(v))}
            stroke="hsl(var(--muted-foreground))"
            tickStroke="hsl(var(--muted-foreground))"
            tickLabelProps={() => ({
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              textAnchor: "end",
              dx: "-0.25em",
              dy: "0.25em",
            })}
          />
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleTooltip}
            onTouchMove={handleTooltip}
            onTouchStart={handleTooltip}
            onMouseLeave={hideTooltip}
          />
          {tooltipData && (
            <Group>
              <VisxLine
                from={{ x: xScale(getX(tooltipData)), y: 0 }}
                to={{ x: xScale(getX(tooltipData)), y: innerHeight }}
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeDasharray="3 2"
                pointerEvents="none"
              />
              <Circle
                cx={xScale(getX(tooltipData))}
                cy={yScale(getY(tooltipData))}
                r={5}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                pointerEvents="none"
              />
            </Group>
          )}
        </Group>
      </svg>
      {tooltipData && (
        <TooltipInPortal top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
          <div className="font-medium">{formatChartTick(getX(tooltipData))}</div>
          <div className="tabular-nums">{formatCurrency(getY(tooltipData))}</div>
        </TooltipInPortal>
      )}
    </div>
  );
}

function NetBalanceLineChart({ series }: { series: NetBalancePoint[] }) {
  return (
    <div style={{ height: 200 }}>
      <ParentSize>
        {({ width, height }) => (
          <NetBalanceChartInner width={width} height={height} series={series} />
        )}
      </ParentSize>
    </div>
  );
}

// ─── Account row ─────────────────────────────────────────────────────────────

function AccountRow({
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
  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
    >
      {/* Color dot */}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: account.color }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold">{account.account_alias}</p>
          <p className="text-xs text-muted-foreground">{account.bank_name}</p>
          {account.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${account.color}22`, color: account.color }}
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Balance on this account</p>
      </div>

      {/* Balance */}
      <p
        className={
          balance < 0
            ? "flex-shrink-0 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400"
            : "flex-shrink-0 text-sm font-semibold tabular-nums"
        }
      >
        {formatCurrency(balance)}
      </p>

      {/* Edit */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        aria-label="Edit account"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      {/* Delete */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete account"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function AccountsBoard() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: accounts } = useSuspenseQuery(accountsQueryOptions());
  const { data: balances } = useSuspenseQuery(accountBalancesQueryOptions());
  const { data: netHistory } = useSuspenseQuery(netBalanceHistoryQueryOptions(7));

  const netBalance = useMemo(
    () =>
      accounts
        .filter((a) => a.include_in_net_balance)
        .reduce((s, acc) => s + (balances[acc.id] ?? 0), 0),
    [accounts, balances],
  );

  const includedCount = useMemo(
    () => accounts.filter((a) => a.include_in_net_balance).length,
    [accounts],
  );

  const hasAnyAccount = accounts.length > 0;

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

      {/* Summary: stats + pie chart */}
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

        {/* 7-day net balance chart */}
        <div className="sm:w-2/3">
          {hasAnyAccount ? (
            <Card className="h-full">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Net Balance — last 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <NetBalanceLineChart series={netHistory} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add an account to see the chart
            </div>
          )}
        </div>
      </div>

      {/* Accounts list */}
      <div className="space-y-2">
        <>
            {accounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                balance={balances[acc.id] ?? 0}
                onOpen={() => router.push(`/dashboard/accounts/${acc.id}`)}
                onEdit={() => { setFormError(null); setEditingAccount(acc); }}
                onDelete={() => setDeletingId(acc.id)}
              />
            ))}
            {accounts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-muted-foreground">
                <p className="text-sm">No accounts yet. Add one to start tracking by account.</p>
                <Button size="sm" variant="outline" onClick={() => { setFormError(null); setAddOpen(true); }}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            )}
          </>
      </div>

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
