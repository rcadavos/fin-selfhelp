"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  Car,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentHeader } from "@/components/app/content-header";
import { formatCurrency, cn } from "@/lib/utils";
import {
  updateVehicle,
  deleteVehicle,
  type VehicleRow,
} from "@/actions/vehicles";
import {
  invalidateVehicleQueries,
  vehicleSpendingQueryOptions,
  vehicleLinkedBillsQueryOptions,
} from "@/lib/query/vehicles";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { BackLink } from "@/components/app/back-link";
import {
  VehicleDialog,
  vehicleToForm,
  type VehicleFormState,
} from "@/components/dashboard/vehicles-board";

const CURRENT_MONTH_YM = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

function formatGroupDate(dateStr: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  fuel: { label: "Fuel", color: "#f59e0b" },
  fees: { label: "Fees", color: "#3b82f6" },
  maintenance: { label: "Maintenance & Repairs", color: "#10b981" },
  insurance: { label: "Insurance & Reg.", color: "#8b5cf6" },
};

export function VehicleDetailBoard({ vehicle }: { vehicle: VehicleRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_YM);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({
        value: ym,
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return opts;
  }, []);

  const { data: spending } = useQuery(vehicleSpendingQueryOptions(selectedMonth));
  const { data: linkedBills } = useQuery(vehicleLinkedBillsQueryOptions(vehicle.id));

  const summary = (spending ?? []).find((s) => s.vehicleId === vehicle.id);
  const expenseEntries = useMemo(
    () => (summary?.entries ?? []).filter((e) => e.source === "expense").sort((a, b) => (a.date < b.date ? 1 : -1)),
    [summary],
  );
  const categoryTotals = useMemo(() => {
    const t = { fuel: 0, fees: 0, maintenance: 0, insurance: 0, other: 0 };
    for (const e of expenseEntries) {
      const c = e.vehicle_category ?? "other";
      if (c === "fuel") t.fuel += e.amount;
      else if (c === "fees") t.fees += e.amount;
      else if (c === "maintenance") t.maintenance += e.amount;
      else if (c === "insurance") t.insurance += e.amount;
      else t.other += e.amount;
    }
    return t;
  }, [expenseEntries]);
  const expensesTotal = expenseEntries.reduce((s, e) => s + e.amount, 0);

  const expenseGroups = useMemo(() => {
    const groups: Array<{ date: string; entries: typeof expenseEntries }> = [];
    for (const e of expenseEntries) {
      const date = e.date.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.entries.push(e);
      } else {
        groups.push({ date, entries: [e] });
      }
    }
    return groups;
  }, [expenseEntries]);

  function invalidate() {
    invalidateVehicleQueries(queryClient);
  }

  async function handleEdit(form: VehicleFormState) {
    setSaveError(null);
    startTransition(async () => {
      const res = await updateVehicle(vehicle.id, {
        name: form.name,
        type: form.type,
        make: form.make || undefined,
        model: form.model || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
        plate_number: form.plate_number || undefined,
        color: form.color || undefined,
        fuel_type: form.fuel_type || undefined,
        notes: form.notes || undefined,
      });
      if (res.error) {
        setSaveError(res.error);
      } else {
        setEditOpen(false);
        invalidate();
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      await deleteVehicle(vehicle.id);
      invalidate();
      router.push("/dashboard/vehicles");
    });
  }

  const subtitleParts = [vehicle.make, vehicle.model, vehicle.year ? String(vehicle.year) : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <BackLink href="/dashboard/vehicles" label="Vehicles" />

      <ContentHeader
        title={
          <span className="flex min-w-0 items-center gap-2">
            <Car className="h-7 w-7 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 truncate">{vehicle.name}</span>
            {vehicle.plate_number && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                {vehicle.plate_number}
              </span>
            )}
          </span>
        }
        subtitle={
          [vehicle.type, subtitleParts, vehicle.fuel_type, vehicle.color]
            .filter(Boolean)
            .join(" • ") || undefined
        }
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => { setSaveError(null); setEditOpen(true); }}
              aria-label="Edit vehicle"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete vehicle"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {saveError && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {/* Notes (if any) */}
      {vehicle.notes && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {vehicle.notes}
        </div>
      )}

      {/* Month selector + Add Expense */}
      <div className="flex items-center justify-between my-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-10 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm font-medium shadow-none hover:bg-muted focus:ring-0 [&>svg]:opacity-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="lg" variant="outline" onClick={() => setAddExpenseOpen(true)} className="gap-1.5">
          <ArrowDownCircle className="h-4 w-4 text-rose-500" aria-hidden />
          Add Expense
        </Button>
      </div>

      {/* Spend summary */}
      <div className="rounded-2xl border bg-card px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Spend this month
        </p>
        <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", expensesTotal === 0 && "text-muted-foreground")}>
          {expensesTotal > 0 ? formatCurrency(expensesTotal) : "—"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["fuel", "fees", "maintenance", "insurance"] as const).map((k) => {
            const v = categoryTotals[k];
            if (v <= 0) return null;
            const meta = CATEGORY_LABELS[k];
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label} • {formatCurrency(v)}
              </span>
            );
          })}
          {categoryTotals.other > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Other • {formatCurrency(categoryTotals.other)}
            </span>
          )}
        </div>
      </div>

      {/* Linked Planned Expenses */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Linked Planned Expenses
        </h2>
        {!linkedBills || linkedBills.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            No planned expenses linked to this vehicle yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {linkedBills.map((b) => {
              const catLabel = labelForVehicleExpenseCategory(b.vehicle_category);
              return (
                <Link
                  key={b.id}
                  href="/dashboard/planned-expenses"
                  className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <Receipt className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {b.billing_period}
                      {catLabel ? ` • ${catLabel}` : ""}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-semibold tabular-nums">
                    {formatCurrency(b.amount)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* History — expense entries grouped by date */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h2>
        {expenseGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
            <p className="text-sm">No entries for this month.</p>
            <p className="max-w-md text-xs">
              Add an expense linked to this vehicle to start tracking its history.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenseGroups.map((group) => (
              <div key={group.date} className="space-y-2">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {formatGroupDate(group.date)}
                </p>
                <ul className="space-y-2">
                  {group.entries.map((e) => {
                    const catLabel = labelForVehicleExpenseCategory(e.vehicle_category);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                              {catLabel ?? "Other"}
                            </span>
                          </div>
                          {e.label && (
                            <p className="mt-0.5 truncate text-sm">{e.label}</p>
                          )}
                        </div>
                        <p className="flex-shrink-0 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                          −{formatCurrency(e.amount)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <VehicleDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={vehicleToForm(vehicle)}
        editingId={vehicle.id}
        isPending={isPending}
      />

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={(v) => !v && setDeleteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete vehicle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the vehicle from your list. Linked planned expenses and expenses will keep their
            data but will no longer be associated with this vehicle.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense */}
      <AddEntryPanel
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        initialCategory="transport"
        initialVehicleId={vehicle.id}
      />

    </div>
  );
}
