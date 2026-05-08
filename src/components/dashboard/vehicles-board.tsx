"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Car,
  Plus,
  Trash2,
  Receipt,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentHeader } from "@/components/app/content-header";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { formatCurrency, cn } from "@/lib/utils";
import {
  vehiclesQueryOptions,
  vehicleSpendingQueryOptions,
  vehicleLinkedBillsQueryOptions,
  invalidateVehicleQueries,
  VEHICLE_CHART_COLORS,
} from "@/lib/query/vehicles";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import Link from "next/link";
import {
  addVehicle,
  updateVehicle,
  deleteVehicle,
  type VehicleRow,
} from "@/actions/vehicles";

// ─── Constants ───────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  "Car", "Motorcycle", "Truck", "Van", "SUV",
  "Pickup", "Bus", "Bicycle", "E-Bike", "Other",
];

const FUEL_TYPES = [
  "Gasoline", "Diesel", "Electric", "Hybrid", "LPG", "CNG", "Other",
];

const COLORS = [
  "Black", "White", "Silver", "Gray", "Red", "Blue",
  "Green", "Yellow", "Orange", "Brown", "Gold", "Other",
];


const CURRENT_YEAR = new Date().getFullYear();

// ─── Types ───────────────────────────────────────────────────────────────────

type VehicleFormState = {
  name: string;
  type: string;
  make: string;
  model: string;
  year: string;
  plate_number: string;
  color: string;
  fuel_type: string;
  notes: string;
};

const EMPTY_FORM: VehicleFormState = {
  name: "",
  type: "",
  make: "",
  model: "",
  year: "",
  plate_number: "",
  color: "",
  fuel_type: "",
  notes: "",
};

function vehicleToForm(v: VehicleRow): VehicleFormState {
  return {
    name: v.name,
    type: v.type,
    make: v.make ?? "",
    model: v.model ?? "",
    year: v.year != null ? String(v.year) : "",
    plate_number: v.plate_number ?? "",
    color: v.color ?? "",
    fuel_type: v.fuel_type ?? "",
    notes: v.notes ?? "",
  };
}

// ─── Category chart config ────────────────────────────────────────────────────

const CATEGORY_BARS = [
  { key: "fuel",        label: "Fuel",                  color: "#f59e0b" },
  { key: "fees",        label: "Fees",                  color: "#3b82f6" },
  { key: "maintenance", label: "Maintenance & Repairs", color: "#10b981" },
  { key: "insurance",   label: "Insurance & Reg.",      color: "#8b5cf6" },
  { key: "other",       label: "Other",                 color: "#94a3b8" },
  { key: "planned",     label: "Planned",               color: "#64748b" },
] as const;


// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name: string; fill: string; payload: { name: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value > 0);
  const total = items.reduce((s, p) => s + p.value, 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md min-w-[160px]">
      <p className="mb-1 font-medium">{payload[0].payload.name}</p>
      {items.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.fill }} />
            {p.name}
          </span>
          <span className="tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {items.length > 1 && (
        <div className="mt-1 flex justify-between border-t pt-1 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Linked Planned Expenses (vehicle edit modal) ────────────────────────────

function LinkedPlannedExpenses({ vehicleId }: { vehicleId: string }) {
  const { data: bills, isPending } = useQuery(vehicleLinkedBillsQueryOptions(vehicleId));

  if (isPending) {
    return (
      <div className="space-y-1.5">
        <Label>Linked Planned Expenses</Label>
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="space-y-1.5">
        <Label>Linked Planned Expenses</Label>
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          No planned expenses linked to this vehicle yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>Linked Planned Expenses</Label>
      <div className="flex flex-col gap-1.5">
        {bills.map((b) => {
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
    </div>
  );
}

// ─── Vehicle Dialog ───────────────────────────────────────────────────────────

function VehicleDialog({
  open,
  onClose,
  onSave,
  initial,
  editingId,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: VehicleFormState) => void;
  initial?: VehicleFormState;
  editingId?: string;
  isPending: boolean;
}) {
  const [form, setForm] = useState<VehicleFormState>(initial ?? EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_FORM);
  }, [open, initial]);

  function set<K extends keyof VehicleFormState>(key: K, val: VehicleFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const isValid = form.name.trim() && form.type;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-w-[min(32rem,calc(100vw-2rem))] max-h-[90dvh]">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle>{editingId ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>
              Vehicle Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. My Honda, Work Truck"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Type + Fuel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Type</Label>
              <Select value={form.fuel_type} onValueChange={(v) => set("fuel_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Fuel" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Make + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Make (Brand)</Label>
              <Input
                placeholder="e.g. Honda"
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input
                placeholder="e.g. Civic"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </div>
          </div>

          {/* Year + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                min="1900"
                max={CURRENT_YEAR + 2}
                placeholder={String(CURRENT_YEAR)}
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v) => set("color", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plate */}
          <div className="space-y-1.5">
            <Label>Plate Number</Label>
            <Input
              placeholder="e.g. ABC 123"
              value={form.plate_number}
              onChange={(e) => set("plate_number", e.target.value.toUpperCase())}
              className="uppercase"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              placeholder="Any additional info..."
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("notes", e.target.value)}
              rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Linked planned expenses (edit mode only) */}
          {editingId && <LinkedPlannedExpenses vehicleId={editingId} />}
        </ScrollFadeBody>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => onSave(form)} disabled={!isValid || isPending}>
              {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Vehicle"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vehicle Row ─────────────────────────────────────────────────────────────

function VehicleRow({
  vehicle,
  totalSpend,
  billSpend,
  expenseSpend,
  color,
  onEdit,
  onDelete,
}: {
  vehicle: VehicleRow;
  totalSpend: number;
  billSpend: number;
  expenseSpend: number;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subtitle = [vehicle.make, vehicle.model, vehicle.year ? String(vehicle.year) : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      onClick={onEdit}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30"
    >
      {/* Color dot */}
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{vehicle.name}</p>
          {vehicle.plate_number && (
            <span className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
              {vehicle.plate_number}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {vehicle.type}{subtitle ? ` • ${subtitle}` : ""}
          {vehicle.fuel_type ? ` • ${vehicle.fuel_type}` : ""}
        </p>
      </div>

      {/* Spend breakdown badges */}
      {totalSpend > 0 && (
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            <Receipt className="h-2.5 w-2.5" />{formatCurrency(billSpend)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            <Banknote className="h-2.5 w-2.5" />{formatCurrency(expenseSpend)}
          </span>
        </div>
      )}

      {/* Total spend */}
      <span className={cn("flex-shrink-0 text-sm font-semibold tabular-nums", totalSpend === 0 && "text-muted-foreground")}>
        {totalSpend > 0 ? formatCurrency(totalSpend) : "—"}
      </span>

      {/* Actions */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex-shrink-0 rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

const CURRENT_MONTH_YM = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

export function VehiclesBoard() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_YM);

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

  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions());
  const { data: spending } = useQuery(vehicleSpendingQueryOptions(selectedMonth));

  const [addOpen, setAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function invalidate() {
    invalidateVehicleQueries(queryClient);
  }

  const spendingData = spending ?? [];

  async function handleAdd(form: VehicleFormState) {
    setSaveError(null);
    startTransition(async () => {
      const res = await addVehicle({
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
      if (res.error) { setSaveError(res.error); }
      else { setAddOpen(false); invalidate(); }
    });
  }

  async function handleEdit(form: VehicleFormState) {
    if (!editingVehicle) return;
    setSaveError(null);
    startTransition(async () => {
      const res = await updateVehicle(editingVehicle.id, {
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
      if (res.error) { setSaveError(res.error); }
      else { setEditingVehicle(null); invalidate(); }
    });
  }

  async function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteVehicle(deletingId);
      setDeletingId(null);
      invalidate();
    });
  }

  // Derived spending data — per-vehicle category breakdown
  const vehicleSpendMap = useMemo(() => {
    type Cats = { fuel: number; fees: number; maintenance: number; insurance: number; other: number; planned: number };
    const map = new Map<string, Cats>();
    for (const s of spendingData) {
      const cats: Cats = { fuel: 0, fees: 0, maintenance: 0, insurance: 0, other: 0, planned: 0 };
      for (const e of s.entries) {
        const cat = e.vehicle_category ?? null;
        if (e.source === "bill") {
          if (cat === "fuel") cats.fuel += e.amount;
          else if (cat === "fees") cats.fees += e.amount;
          else if (cat === "maintenance") cats.maintenance += e.amount;
          else if (cat === "insurance") cats.insurance += e.amount;
          else if (cat) cats.other += e.amount;
          else cats.planned += e.amount;
        } else {
          const expCat = cat ?? "other";
          if (expCat === "fuel") cats.fuel += e.amount;
          else if (expCat === "fees") cats.fees += e.amount;
          else if (expCat === "maintenance") cats.maintenance += e.amount;
          else if (expCat === "insurance") cats.insurance += e.amount;
          else cats.other += e.amount;
        }
      }
      map.set(s.vehicleId, cats);
    }
    return map;
  }, [spendingData]);

  const totalSpend = useMemo(
    () => spendingData.reduce((s, v) => s + v.totalBills + v.totalExpenses, 0),
    [spendingData],
  );

  const totalLinked = useMemo(
    () => spendingData.reduce((s, v) => s + v.entries.length, 0),
    [spendingData],
  );

  // Chart data — vehicles sorted by total spend desc
  const chartData = useMemo(() => {
    return vehicles
      .map((v) => {
        const c = vehicleSpendMap.get(v.id) ?? { fuel: 0, fees: 0, maintenance: 0, insurance: 0, other: 0, planned: 0 };
        const total = c.fuel + c.fees + c.maintenance + c.insurance + c.other + c.planned;
        return { id: v.id, name: v.name, total, ...c };
      })
      .sort((a, b) => b.total - a.total);
  }, [vehicles, vehicleSpendMap]);

  const hasVehicles = vehicles.length > 0;
  const hasSpend = totalSpend > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <ContentHeader
        title="Vehicles"
        subtitle="Register your vehicles and track linked planned expenses and expenses with Transportation category."
        icon={Car}
      />

      {saveError && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {/* Stats + Chart — only when there are vehicles */}
      {hasVehicles && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Stat cards */}
          <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
            <div className="flex-1 rounded-xl border bg-card px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                Vehicles
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{vehicles.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {vehicles.length === 1 ? "registered" : "registered"}
              </p>
            </div>
            <div className="flex-1 rounded-xl border bg-card px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                Total Spend
              </p>
              <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", hasSpend ? "" : "text-muted-foreground")}>
                {hasSpend ? formatCurrency(totalSpend) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {totalLinked} linked {totalLinked === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="sm:w-2/3">
            {hasSpend ? (
              <Card className="h-full">
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Spendings by vehicle this month
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => formatCurrency(v)}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                      />
                      {CATEGORY_BARS.map((cat) => (
                        <Bar
                          key={cat.key}
                          dataKey={cat.key}
                          name={cat.label}
                          fill={cat.color}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
                No spending recorded for this month
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month selector + Add Vehicle button */}
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
        <Button size="lg" onClick={() => { setSaveError(null); setAddOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden />
          Add Vehicle
        </Button>
      </div>

      {/* Vehicle list */}
      {hasVehicles ? (
        <div className="flex flex-col gap-2">
          {vehicles.map((vehicle, i) => {
            const c = vehicleSpendMap.get(vehicle.id) ?? { fuel: 0, fees: 0, maintenance: 0, insurance: 0, other: 0, planned: 0 };
            const expenseSpend = c.fuel + c.fees + c.maintenance + c.insurance + c.other;
            const billSpend = c.planned;
            const color = VEHICLE_CHART_COLORS[i % VEHICLE_CHART_COLORS.length];
            return (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                totalSpend={billSpend + expenseSpend}
                billSpend={billSpend}
                expenseSpend={expenseSpend}
                color={color}
                onEdit={() => { setSaveError(null); setEditingVehicle(vehicle); }}
                onDelete={() => setDeletingId(vehicle.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-base font-semibold">No vehicles yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Add your first vehicle to start tracking gas and transport costs.
          </p>
          <Button className="mt-5" onClick={() => { setSaveError(null); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Your First Vehicle
          </Button>
        </div>
      )}

      {/* Tip banner — only on current month with no spend (likely nothing linked yet) */}
      {hasVehicles && !hasSpend && selectedMonth === CURRENT_MONTH_YM && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Tip:</strong>{" "}
          When adding a Planned Expense or Expense under the{" "}
          <em>Transport &amp; Commute</em> category, you can link it to one of your
          vehicles to see per-vehicle spending here.
        </div>
      )}

      {/* Dialogs */}
      <VehicleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        isPending={isPending}
      />

      <VehicleDialog
        open={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSave={handleEdit}
        initial={editingVehicle ? vehicleToForm(editingVehicle) : undefined}
        editingId={editingVehicle?.id}
        isPending={isPending}
      />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
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
              onClick={() => setDeletingId(null)}
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
    </div>
  );
}
