"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shiftPaidMonth } from "@/lib/paid-month";
import { VEHICLE_MAX_YEAR_AHEAD, VEHICLE_MIN_YEAR } from "@/lib/constants/vehicles";

export type VehicleInput = {
  name: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
  plate_number?: string;
  color?: string;
  fuel_type?: string;
  notes?: string;
};

/** The form's own checks, repeated here so a crafted request can't skip them. */
function validateVehicleInput(input: VehicleInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!input.type.trim()) return "Type is required.";
  if (input.year != null) {
    const maxYear = new Date().getFullYear() + VEHICLE_MAX_YEAR_AHEAD;
    if (!Number.isInteger(input.year) || input.year < VEHICLE_MIN_YEAR || input.year > maxYear) {
      return `Year must be between ${VEHICLE_MIN_YEAR} and ${maxYear}.`;
    }
  }
  return null;
}

export type VehicleRow = {
  id: string;
  name: string;
  type: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  plate_number?: string | null;
  color?: string | null;
  fuel_type?: string | null;
  notes?: string | null;
  created_at: string;
};

export async function loadVehicles(): Promise<{ vehicles: VehicleRow[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { vehicles: [], error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { vehicles: [] };

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, name, type, make, model, year, plate_number, color, fuel_type, notes, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  if (error) return { vehicles: [], error: error.message };

  return {
    vehicles: (data ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      make: r.make ?? null,
      model: r.model ?? null,
      year: r.year != null ? Number(r.year) : null,
      plate_number: r.plate_number ?? null,
      color: r.color ?? null,
      fuel_type: r.fuel_type ?? null,
      notes: r.notes ?? null,
      created_at: String(r.created_at),
    })),
  };
}

export async function addVehicle(input: VehicleInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "no_profile" };

  const invalid = validateVehicleInput(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("vehicles").insert({
    profile_id: profile.id,
    name: input.name.trim(),
    type: input.type.trim(),
    make: input.make?.trim() || null,
    model: input.model?.trim() || null,
    year: input.year ?? null,
    plate_number: input.plate_number?.trim() || null,
    color: input.color?.trim() || null,
    fuel_type: input.fuel_type?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/vehicles");
  return {};
}

export async function updateVehicle(
  vehicleId: string,
  input: VehicleInput,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "no_profile" };

  const invalid = validateVehicleInput(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase
    .from("vehicles")
    .update({
      name: input.name.trim(),
      type: input.type.trim(),
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      year: input.year ?? null,
      plate_number: input.plate_number?.trim() || null,
      color: input.color?.trim() || null,
      fuel_type: input.fuel_type?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/vehicles");
  return {};
}

export type VehicleSpendEntry = {
  id: string;
  vehicleId: string;
  source: "bill" | "expense";
  /** The expense or bill's own name, or null when it has none. */
  label: string | null;
  amount: number;
  /** ISO timestamp: when the expense happened, or when the bill payment was made. */
  date: string;
  /** YYYY-MM the entry counts toward: the expense's month, or the month a bill payment settles. */
  month: string;
  vehicle_category: string | null;
  /** The bill a payment belongs to; null for an expense. */
  billId: string | null;
};

const MAX_SPENDING_MONTHS = 24;

function nameOf(row: { note?: string | null; notes?: string | null }): string | null {
  return row.note?.trim() || row.notes?.trim() || null;
}

/**
 * Everything spent on the user's vehicles in the `months` months ending at `endMonth`:
 * expenses linked to a vehicle, by the month they happened, and payments made on bills
 * linked to a vehicle, by the month each payment settles. A bill counts what was
 * actually paid that month, so a monthly car loan shows up every month it is paid,
 * part payments count what was paid, and an unpaid bill counts nothing.
 */
export async function loadVehicleSpending(
  endMonth: string,
  months: number,
): Promise<{ entries: VehicleSpendEntry[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { entries: [], error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { entries: [] };

  const span = Math.min(Math.max(Math.trunc(months) || 1, 1), MAX_SPENDING_MONTHS);
  const startMonth = shiftPaidMonth(endMonth, -(span - 1));
  if (!startMonth) return { entries: [], error: "invalid_month" };
  const lastDay = new Date(Number(endMonth.slice(0, 4)), Number(endMonth.slice(5, 7)), 0).getDate();
  const rangeStart = `${startMonth}-01`;
  const rangeEnd = `${endMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999`;

  const [expensesRes, billsRes] = await Promise.all([
    supabase
      .from("expense_entries")
      .select("id, note, notes, amount, vehicle_id, vehicle_category, created_at")
      .eq("profile_id", profile.id)
      .not("vehicle_id", "is", null)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("bills")
      .select("id, note, notes, vehicle_id, vehicle_category")
      .eq("profile_id", profile.id)
      .not("vehicle_id", "is", null),
  ]);
  if (expensesRes.error) return { entries: [], error: expensesRes.error.message };
  if (billsRes.error) return { entries: [], error: billsRes.error.message };

  const entries: VehicleSpendEntry[] = [];

  for (const row of expensesRes.data ?? []) {
    const amount = Number(row.amount);
    const date = String(row.created_at ?? "");
    if (!(amount > 0) || !date) continue;
    entries.push({
      id: String(row.id),
      vehicleId: String(row.vehicle_id),
      source: "expense",
      label: nameOf(row),
      amount,
      date,
      month: date.slice(0, 7),
      vehicle_category: (row.vehicle_category as string | null) ?? null,
      billId: null,
    });
  }

  const linkedBills = new Map((billsRes.data ?? []).map((b) => [String(b.id), b]));
  if (linkedBills.size > 0) {
    const { data: payments, error } = await supabase
      .from("bill_payments")
      .select("id, bill_id, paid_month, paid_at, amount_paid")
      .eq("profile_id", profile.id)
      .eq("status", "paid")
      .in("bill_id", Array.from(linkedBills.keys()))
      .gte("paid_month", startMonth)
      .lte("paid_month", endMonth);
    if (error) return { entries: [], error: error.message };

    for (const p of payments ?? []) {
      const bill = linkedBills.get(String(p.bill_id));
      const amount = Number(p.amount_paid);
      if (!bill || !(amount > 0)) continue;
      const month = String(p.paid_month);
      entries.push({
        id: String(p.id),
        vehicleId: String(bill.vehicle_id),
        source: "bill",
        label: nameOf(bill),
        amount,
        date: p.paid_at ? String(p.paid_at) : `${month}-01T00:00:00`,
        month,
        vehicle_category: (bill.vehicle_category as string | null) ?? null,
        billId: String(bill.id),
      });
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  return { entries };
}

export type VehicleLinkedBill = {
  id: string;
  label: string;
  amount: number;
  billing_period: "monthly" | "quarterly" | "yearly";
  due_date: string | null;
  /** YYYY-MM-DD the bill stops, or null when it runs on. */
  end_date: string | null;
  vehicle_category: string | null;
};

export async function loadVehicleLinkedBills(
  vehicleId: string,
): Promise<{ bills: VehicleLinkedBill[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { bills: [], error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { bills: [] };

  const { data, error } = await supabase
    .from("bills")
    .select("id, note, notes, amount, billing_period, due_date, end_date, vehicle_category, created_at")
    .eq("profile_id", profile.id)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });

  if (error) return { bills: [], error: error.message };

  return {
    bills: (data ?? []).map((row) => ({
      id: String(row.id),
      label: nameOf(row) ?? "Bill",
      amount: Number(row.amount),
      billing_period:
        row.billing_period === "yearly"
          ? "yearly"
          : row.billing_period === "quarterly"
            ? "quarterly"
            : "monthly",
      due_date: (row.due_date as string | null) ?? null,
      end_date: (row.end_date as string | null) ?? null,
      vehicle_category: (row.vehicle_category as string | null) ?? null,
    })),
  };
}

export async function deleteVehicle(vehicleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "no_profile" };

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/vehicles");
  return {};
}
