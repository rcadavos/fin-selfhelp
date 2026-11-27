"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownCircle, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { BackLink } from "@/components/app/back-link";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { PlateChip, VehicleAvatar } from "@/components/dashboard/vehicles/vehicle-identity";
import { VehicleCategoryBreakdown } from "@/components/dashboard/vehicles/vehicle-category-breakdown";
import { VehicleDetailsCard } from "@/components/dashboard/vehicles/vehicle-details-card";
import { VehicleHistory } from "@/components/dashboard/vehicles/vehicle-history";
import { VehicleLinkedBills } from "@/components/dashboard/vehicles/vehicle-linked-bills";
import { VehicleMonthSelect } from "@/components/dashboard/vehicles/vehicle-month-select";
import { VehicleSpendPanel } from "@/components/dashboard/vehicles/vehicle-spend-panel";
import {
  VehicleFormPanel,
  formToVehicleInput,
  vehicleToForm,
  type VehicleFormState,
} from "@/components/dashboard/vehicles/vehicle-form-panel";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { deleteVehicle, updateVehicle } from "@/actions/vehicles";
import {
  VEHICLE_CHART_COLORS,
  buildVehicleColorMap,
  invalidateVehicleQueries,
  vehicleLinkedBillsQueryOptions,
  vehicleSpendingQueryOptions,
  vehiclesQueryOptions,
} from "@/lib/query/vehicles";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { VEHICLE_TREND_MONTHS } from "@/lib/constants/vehicles";
import { monthName, summariseSpending, trendMonths, vehicleSubtitle } from "@/lib/vehicles/spending";
import { cn } from "@/lib/utils";

/**
 * One vehicle's page: the month's spending against the months before, where it
 * went, every expense and bill payment that month day by day, the bills tied to
 * it, and its details.
 *
 * `currentMonth` comes from the server, which also prefetched that month's data.
 */
export function VehicleDetailBoard({ vehicleId, currentMonth }: { vehicleId: string; currentMonth: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currency = useUserPreferencesOptional()?.preferences.currency ?? DEFAULT_USER_PREFERENCES.currency;

  const [month, setMonth] = useState(currentMonth);
  const [isSwitching, startSwitch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions());
  const { data: entries } = useSuspenseQuery(vehicleSpendingQueryOptions(month));
  const { data: linkedBills } = useSuspenseQuery(vehicleLinkedBillsQueryOptions(vehicleId));

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  // Deleted: the page is on its way back to the list.
  if (!vehicle) return null;

  const color = buildVehicleColorMap(vehicles)[vehicleId] ?? VEHICLE_CHART_COLORS[0];
  const summary = summariseSpending(
    entries.filter((e) => e.vehicleId === vehicleId),
    {
      months: trendMonths(month, VEHICLE_TREND_MONTHS),
      inProgressMonth: currentMonth,
      since: vehicle.created_at.slice(0, 7),
    },
  );

  function openEdit() {
    setSaveError(null);
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  function handleEdit(form: VehicleFormState) {
    setSaveError(null);
    startSave(async () => {
      const res = await updateVehicle(vehicleId, formToVehicleInput(form));
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      setEditOpen(false);
      await invalidateVehicleQueries(queryClient);
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startSave(async () => {
      const res = await deleteVehicle(vehicleId);
      if (res.error) {
        setDeleteError(res.error);
        return;
      }
      router.push("/dashboard/vehicles");
      void invalidateVehicleQueries(queryClient);
    });
  }

  const monthLabel = monthName(month);
  const details = [vehicle.type, vehicleSubtitle(vehicle), vehicle.fuel_type, vehicle.color].filter(Boolean).join(" • ");
  const breakdown = (className: string) => (
    <VehicleCategoryBreakdown
      className={className}
      categories={summary.categories}
      total={summary.total}
      monthLabel={monthLabel}
      currency={currency}
      emptyHint={`Nothing spent on ${vehicle.name} in ${monthLabel}.`}
    />
  );

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6 lg:max-w-6xl">
      <BackLink href="/dashboard/vehicles" label="Vehicles" />

      <ContentHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <VehicleAvatar type={vehicle.type} color={color} />
            <span className="min-w-0 truncate">{vehicle.name}</span>
            {vehicle.plate_number && <PlateChip plate={vehicle.plate_number} className="hidden sm:inline-flex" />}
          </span>
        }
        subtitle={details || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size={CONTENT_HEADER_ACTION_SIZE.icon}
              variant="outline"
              onClick={openEdit}
              disabled={isSaving}
              aria-label="Edit vehicle"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size={CONTENT_HEADER_ACTION_SIZE.icon}
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isSaving}
              aria-label="Delete vehicle"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      {deleteError && (
        <div
          role="alert"
          className="surface flex items-center justify-between gap-3 border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          <span>Couldn&apos;t delete this vehicle: {deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label="Dismiss"
            className="tap-target rounded-full p-0.5 hover:bg-destructive/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <VehicleMonthSelect
          value={month}
          onChange={(m) => startSwitch(() => setMonth(m))}
          latestMonth={currentMonth}
        />
        <Button size="lg" variant="outline" onClick={() => setExpenseOpen(true)} className="gap-1.5">
          <ArrowDownCircle className="size-4 text-destructive" aria-hidden />
          Add expense
        </Button>
      </div>

      <div
        aria-busy={isSwitching}
        className={cn(
          "grid gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start",
          isSwitching && "opacity-60",
        )}
      >
        <div className="min-w-0 space-y-4">
          <VehicleSpendPanel
            summary={summary}
            isCurrentMonth={month === currentMonth}
            currency={currency}
            label={`Spending on ${vehicle.name}`}
          />
          {breakdown("lg:hidden")}
          <VehicleHistory
            entries={summary.monthEntries}
            monthLabel={monthLabel}
            currency={currency}
            onAddExpense={() => setExpenseOpen(true)}
          />
        </div>

        <aside aria-label={`About ${vehicle.name}`} className="flex min-w-0 flex-col gap-4">
          {breakdown("hidden lg:block")}
          <VehicleLinkedBills bills={linkedBills} currentMonth={currentMonth} currency={currency} />
          <VehicleDetailsCard vehicle={vehicle} onEdit={openEdit} />
        </aside>
      </div>

      <VehicleFormPanel
        key={editKey}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={vehicleToForm(vehicle)}
        mode="edit"
        isPending={isSaving}
        error={saveError}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${vehicle.name}?`}
        description="It comes off your list. Its expenses and bills stay, but they are no longer linked to a vehicle."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <AddEntryPanel
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        initialCategory="transport"
        initialVehicleId={vehicle.id}
      />
    </div>
  );
}
