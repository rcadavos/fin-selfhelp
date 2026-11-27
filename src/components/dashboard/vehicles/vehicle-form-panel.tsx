"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { NotesField } from "@/components/app/notes-field";
import { PaintSwatch, VehicleTypeIcon } from "@/components/dashboard/vehicles/vehicle-identity";
import { cn } from "@/lib/utils";
import type { VehicleInput, VehicleRow } from "@/actions/vehicles";
import {
  VEHICLE_FUEL_TYPES,
  VEHICLE_MAX_YEAR_AHEAD,
  VEHICLE_MIN_YEAR,
  VEHICLE_PAINT_COLORS,
  VEHICLE_TYPES,
} from "@/lib/constants/vehicles";

export type VehicleFormState = {
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

export function vehicleToForm(v: VehicleRow): VehicleFormState {
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

export function formToVehicleInput(form: VehicleFormState): VehicleInput {
  return {
    name: form.name,
    type: form.type,
    make: form.make || undefined,
    model: form.model || undefined,
    year: form.year ? parseInt(form.year, 10) : undefined,
    plate_number: form.plate_number || undefined,
    color: form.color || undefined,
    fuel_type: form.fuel_type || undefined,
    notes: form.notes || undefined,
  };
}

const CHIP_BASE =
  "surface flex items-center justify-center gap-1.5 border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CHIP_ON = "border-primary bg-primary/10 text-primary";
const CHIP_OFF = "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";

/**
 * Add or edit a vehicle. Type, fuel and colour are tap-to-pick chips rather than
 * dropdowns, so the common choices are one tap each; tapping a picked fuel or
 * colour again clears it.
 *
 * The form reads `initial` once, when it mounts. Give it a new `key` each time it
 * opens so it starts from the vehicle as it is now.
 */
export function VehicleFormPanel({
  open,
  onClose,
  onSave,
  initial,
  mode,
  isPending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: VehicleFormState) => void;
  initial?: VehicleFormState;
  mode: "add" | "edit";
  isPending: boolean;
  /** A save error from the server, shown above the buttons. */
  error?: string | null;
}) {
  const [form, setForm] = useState<VehicleFormState>(initial ?? EMPTY_FORM);

  function set<K extends keyof VehicleFormState>(key: K, val: VehicleFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const maxYear = new Date().getFullYear() + VEHICLE_MAX_YEAR_AHEAD;
  const yearNum = form.year ? Number(form.year) : null;
  const yearInvalid =
    yearNum !== null && (!Number.isInteger(yearNum) || yearNum < VEHICLE_MIN_YEAR || yearNum > maxYear);
  const isValid = !!form.name.trim() && !!form.type && !yearInvalid;

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle>{mode === "edit" ? "Edit vehicle" : "Add a vehicle"}</DialogTitle>
        <DialogDescription>
          {mode === "edit"
            ? "Changes show everywhere this vehicle is linked."
            : "Link Transport expenses and bills to it to see what it costs you each month."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid && !isPending) onSave(form);
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <ScrollFadeBody className="space-y-5 px-6 pb-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium leading-none">
              Type <span className="text-destructive">*</span>
            </legend>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {VEHICLE_TYPES.map((type) => {
                const active = form.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("type", type)}
                    className={cn(CHIP_BASE, "flex-col px-1 py-2.5 text-[11px] leading-tight", active ? CHIP_ON : CHIP_OFF)}
                  >
                    <VehicleTypeIcon type={type} className="size-4" />
                    <span className="break-words text-center">{type}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="vehicle-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicle-name"
              placeholder="e.g. Family car, Work truck"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus={mode === "add"}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vehicle-make">Make</Label>
            <Input
              id="vehicle-make"
              placeholder="e.g. Toyota"
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vehicle-model">Model</Label>
            <Input
              id="vehicle-model"
              placeholder="e.g. Vios"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vehicle-year">Year</Label>
            <Input
              id="vehicle-year"
              type="number"
              inputMode="numeric"
              min={VEHICLE_MIN_YEAR}
              max={maxYear}
              placeholder={String(new Date().getFullYear())}
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              aria-invalid={yearInvalid || undefined}
              aria-describedby={yearInvalid ? "vehicle-year-error" : undefined}
            />
            {yearInvalid && (
              <p id="vehicle-year-error" className="text-xs text-destructive">
                Enter a year from {VEHICLE_MIN_YEAR} to {maxYear}.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vehicle-plate">Plate number</Label>
            <Input
              id="vehicle-plate"
              placeholder="e.g. ABC 1234"
              value={form.plate_number}
              onChange={(e) => set("plate_number", e.target.value.toUpperCase())}
              className="font-mono uppercase tracking-[0.08em]"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium leading-none">Fuel</legend>
            <div className="flex flex-wrap gap-1.5">
              {VEHICLE_FUEL_TYPES.map((fuel) => {
                const active = form.fuel_type === fuel;
                return (
                  <button
                    key={fuel}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("fuel_type", active ? "" : fuel)}
                    className={cn(CHIP_BASE, "px-3 py-2", active ? CHIP_ON : CHIP_OFF)}
                  >
                    {fuel}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium leading-none">Color</legend>
            <div className="flex flex-wrap gap-1.5">
              {VEHICLE_PAINT_COLORS.map(({ name }) => {
                const active = form.color === name;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("color", active ? "" : name)}
                    className={cn(CHIP_BASE, "px-2.5 py-2", active ? CHIP_ON : CHIP_OFF)}
                  >
                    <PaintSwatch name={name} />
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <NotesField
            id="vehicle-notes"
            value={form.notes}
            onChange={(v) => set("notes", v)}
            placeholder="e.g. Next oil change at 50,000 km"
          />
        </ScrollFadeBody>

        {error && (
          <p role="alert" className="mx-6 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11">
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!isValid || isPending}>
              {isPending ? "Saving…" : mode === "edit" ? "Save changes" : "Add vehicle"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}
