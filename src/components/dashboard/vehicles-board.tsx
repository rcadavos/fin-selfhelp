"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownCircle, Car, Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { OttoAnimated } from "@/components/mascot/otto";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { VehicleCard } from "@/components/dashboard/vehicles/vehicle-card";
import { VehicleCategoryBreakdown } from "@/components/dashboard/vehicles/vehicle-category-breakdown";
import { VehicleMonthSelect } from "@/components/dashboard/vehicles/vehicle-month-select";
import { VehicleSpendPanel } from "@/components/dashboard/vehicles/vehicle-spend-panel";
import {
  VehicleFormPanel,
  formToVehicleInput,
  type VehicleFormState,
} from "@/components/dashboard/vehicles/vehicle-form-panel";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { addVehicle } from "@/actions/vehicles";
import {
  buildVehicleColorMap,
  invalidateVehicleQueries,
  vehicleSpendingQueryOptions,
  vehiclesQueryOptions,
} from "@/lib/query/vehicles";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { VEHICLE_TREND_MONTHS } from "@/lib/constants/vehicles";
import { monthName, summariseSpending, trendMonths } from "@/lib/vehicles/spending";
import { cn } from "@/lib/utils";

function NoVehicles({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-2 border border-dashed border-border px-4 py-12 text-center">
      <OttoAnimated pose="think" size={140} />
      <p className="text-base font-semibold">No vehicles yet</p>
      <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
        Add your car, motorbike or bike. Then link fuel, repairs, tolls and insurance to it, and see what it really
        costs you each month.
      </p>
      <Button size="lg" className="mt-3 gap-1.5" onClick={onAdd}>
        <Plus className="size-4" aria-hidden />
        Add your first vehicle
      </Button>
    </div>
  );
}

/**
 * The Vehicles page: what all your vehicles cost in a month, against the months
 * before, where the money went, and a card per vehicle that opens its own page.
 *
 * `currentMonth` comes from the server, which also prefetched that month's data,
 * so the first render here matches what the server rendered.
 */
export function VehiclesBoard({ currentMonth }: { currentMonth: string }) {
  const queryClient = useQueryClient();
  const currency = useUserPreferencesOptional()?.preferences.currency ?? DEFAULT_USER_PREFERENCES.currency;

  const [month, setMonth] = useState(currentMonth);
  // Switching month in a transition keeps this month on screen, dimmed, while
  // the next one loads, instead of dropping back to the page skeleton.
  const [isSwitching, startSwitch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions());
  const { data: entries } = useSuspenseQuery(vehicleSpendingQueryOptions(month));

  const isCurrentMonth = month === currentMonth;
  const colorMap = useMemo(() => buildVehicleColorMap(vehicles), [vehicles]);

  const { fleet, perVehicle, hasAnySpending } = useMemo(() => {
    const months = trendMonths(month, VEHICLE_TREND_MONTHS);
    const ids = new Set(vehicles.map((v) => v.id));
    const linked = entries.filter((e) => ids.has(e.vehicleId));
    const firstAdded = vehicles.map((v) => v.created_at.slice(0, 7)).sort()[0] ?? null;
    return {
      fleet: summariseSpending(linked, { months, inProgressMonth: currentMonth, since: firstAdded }),
      perVehicle: vehicles.map((vehicle) => ({
        vehicle,
        summary: summariseSpending(
          linked.filter((e) => e.vehicleId === vehicle.id),
          { months, inProgressMonth: currentMonth, since: vehicle.created_at.slice(0, 7) },
        ),
      })),
      hasAnySpending: linked.length > 0,
    };
  }, [vehicles, entries, month, currentMonth]);

  function openAdd() {
    setSaveError(null);
    setAddKey((k) => k + 1);
    setAddOpen(true);
  }

  function handleAdd(form: VehicleFormState) {
    setSaveError(null);
    startSave(async () => {
      const res = await addVehicle(formToVehicleInput(form));
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      setAddOpen(false);
      await invalidateVehicleQueries(queryClient);
    });
  }

  const hasVehicles = vehicles.length > 0;
  const monthLabel = monthName(month);

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6 lg:max-w-6xl">
      <ContentHeader
        title="Vehicles"
        icon={Car}
        subtitle="What each vehicle costs you, month by month: fuel, repairs, insurance, tolls and the bills tied to it."
        actions={
          hasVehicles ? (
            <Button size={CONTENT_HEADER_ACTION_SIZE.button} className="gap-1.5" onClick={openAdd}>
              <Plus className="size-4" aria-hidden />
              Add vehicle
            </Button>
          ) : undefined
        }
      />

      {!hasVehicles ? (
        <NoVehicles onAdd={openAdd} />
      ) : (
        <>
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

          {/* One column on phones (panel, vehicles, then the breakdown); from lg the
              breakdown becomes a rail beside them. */}
          <div
            aria-busy={isSwitching}
            className={cn(
              "grid gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start",
              isSwitching && "opacity-60",
            )}
          >
            <div className="min-w-0 space-y-4">
              <VehicleSpendPanel
                summary={fleet}
                isCurrentMonth={isCurrentMonth}
                currency={currency}
                label="Spending on all your vehicles"
              />

              {!hasAnySpending && (
                <div className="surface flex items-start gap-2.5 border border-dashed border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <p>
                    <strong className="font-medium text-foreground">Nothing linked yet.</strong> When you add an expense
                    or a bill under <em>Transport &amp; Commute</em>, pick one of your vehicles and it is counted here.
                  </p>
                </div>
              )}

              <section aria-labelledby="your-vehicles-heading" className="space-y-3">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <h2 id="your-vehicles-heading" className="text-[13.5px] font-semibold">
                    Your vehicles
                  </h2>
                  <span className="text-[11.5px] text-muted-foreground">{vehicles.length} registered</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {perVehicle.map(({ vehicle, summary }) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      color={colorMap[vehicle.id]}
                      summary={summary}
                      isCurrentMonth={isCurrentMonth}
                      currency={currency}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="min-w-0">
              <VehicleCategoryBreakdown
                categories={fleet.categories}
                total={fleet.total}
                monthLabel={monthLabel}
                currency={currency}
                emptyHint={`Nothing spent on your vehicles in ${monthLabel}.`}
              />
            </div>
          </div>

          <AddEntryPanel
            open={expenseOpen}
            onClose={() => setExpenseOpen(false)}
            initialCategory="transport"
            initialVehicleId={vehicles[0]?.id}
          />
        </>
      )}

      <VehicleFormPanel
        key={addKey}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        mode="add"
        isPending={isSaving}
        error={saveError}
      />
    </div>
  );
}
