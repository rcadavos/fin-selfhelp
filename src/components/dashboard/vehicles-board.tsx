"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Car,
  Plus,
  Trash2,
  Fuel,
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
import { useUser } from "@/hooks/use-user";
import { formatCurrency, cn } from "@/lib/utils";
import {
  vehiclesQueryOptions,
  vehicleSpendingQueryOptions,
  invalidateVehicleQueries,
  VEHICLE_CHART_COLORS,
} from "@/lib/query/vehicles";
import {
  addVehicle,
  updateVehicle,
  deleteVehicle,
  type VehicleRow,
} from "@/actions/vehicles";
import DashboardLoading from "@/app/(main)/dashboard/loading";

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

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { name: string } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
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
      <DialogContent className="w-full max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
        </div>

        <DialogFooter className="gap-2 w-full justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={!isValid || isPending}>
            {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Vehicle"}
          </Button>
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

export function VehiclesBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: vehicles, isLoading } = useQuery({
    ...vehiclesQueryOptions(),
    enabled: !!user,
  });

  const { data: spending } = useQuery({
    ...vehicleSpendingQueryOptions(),
    enabled: !!user,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function invalidate() {
    invalidateVehicleQueries(queryClient);
  }

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

  // Derived spending data
  const vehicleSpendMap = useMemo(() => {
    const map = new Map<string, { bills: number; expenses: number }>();
    for (const s of spending ?? []) {
      map.set(s.vehicleId, { bills: s.totalBills, expenses: s.totalExpenses });
    }
    return map;
  }, [spending]);

  const totalSpend = useMemo(
    () => (spending ?? []).reduce((s, v) => s + v.totalBills + v.totalExpenses, 0),
    [spending],
  );

  const totalLinked = useMemo(
    () => (spending ?? []).reduce((s, v) => s + v.entries.length, 0),
    [spending],
  );

  // Chart data — vehicles sorted by total spend desc
  const chartData = useMemo(() => {
    if (!vehicles) return [];
    return vehicles
      .map((v, i) => {
        const s = vehicleSpendMap.get(v.id) ?? { bills: 0, expenses: 0 };
        return {
          id: v.id,
          name: v.name,
          total: s.bills + s.expenses,
          bills: s.bills,
          expenses: s.expenses,
          color: VEHICLE_CHART_COLORS[i % VEHICLE_CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [vehicles, vehicleSpendMap]);

  if (isLoading) return <DashboardLoading />;

  const hasVehicles = vehicles && vehicles.length > 0;
  const hasSpend = totalSpend > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <ContentHeader
        title="Fuel & Vehicles"
        subtitle="Register your vehicles and track linked bills and expenses with Transportation category."
        icon={Fuel}
        actions={
          <Button size="sm" onClick={() => { setSaveError(null); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Vehicle
          </Button>
        }
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
                    Spend by vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-2">
                  <ResponsiveContainer width="100%" height={160}>
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
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={entry.id} fill={VEHICLE_CHART_COLORS[i % VEHICLE_CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
                Link bills or expenses to a vehicle to see the chart
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle list */}
      {hasVehicles ? (
        <div className="flex flex-col gap-2">
          {vehicles.map((vehicle, i) => {
            const s = vehicleSpendMap.get(vehicle.id) ?? { bills: 0, expenses: 0 };
            const color = VEHICLE_CHART_COLORS[i % VEHICLE_CHART_COLORS.length];
            return (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                totalSpend={s.bills + s.expenses}
                billSpend={s.bills}
                expenseSpend={s.expenses}
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

      {/* Tip banner — vehicles exist but nothing linked */}
      {hasVehicles && !hasSpend && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Tip:</strong>{" "}
          When adding a Bill or Expense under the{" "}
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
            This removes the vehicle from your list. Linked bills and expenses will keep their
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
