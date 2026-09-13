"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function loadVehicle(
  vehicleId: string,
): Promise<{ vehicle: VehicleRow | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { vehicle: null, error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { vehicle: null };

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, name, type, make, model, year, plate_number, color, fuel_type, notes, created_at")
    .eq("id", vehicleId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (error) return { vehicle: null, error: error.message };
  if (!data) return { vehicle: null };

  return {
    vehicle: {
      id: String(data.id),
      name: String(data.name),
      type: String(data.type),
      make: data.make ?? null,
      model: data.model ?? null,
      year: data.year != null ? Number(data.year) : null,
      plate_number: data.plate_number ?? null,
      color: data.color ?? null,
      fuel_type: data.fuel_type ?? null,
      notes: data.notes ?? null,
      created_at: String(data.created_at),
    },
  };
}

export async function addVehicle(input: {
  name: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
  plate_number?: string;
  color?: string;
  fuel_type?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "no_profile" };

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.type.trim()) return { error: "Type is required." };

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
  input: {
    name: string;
    type: string;
    make?: string;
    model?: string;
    year?: number;
    plate_number?: string;
    color?: string;
    fuel_type?: string;
    notes?: string;
  },
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

  if (!input.name.trim()) return { error: "Name is required." };
  if (!input.type.trim()) return { error: "Type is required." };

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
  source: "bill" | "expense";
  label: string;
  amount: number;
  date: string;
  vehicle_category?: string | null;
};

export type VehicleSpendSummary = {
  vehicleId: string;
  totalBills: number;
  totalExpenses: number;
  entries: VehicleSpendEntry[];
};

export async function loadVehicleSpending(month?: string): Promise<{ summaries: VehicleSpendSummary[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { summaries: [], error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { summaries: [] };

  const validMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : null;
  const monthStart = validMonth ? `${validMonth}-01` : null;
  const monthEnd = validMonth
    ? `${validMonth}-${new Date(Number(validMonth.slice(0, 4)), Number(validMonth.slice(5, 7)), 0).getDate()}`
    : null;

  let billsQuery = supabase
    .from("bills")
    .select("id, note, notes, amount, vehicle_id, vehicle_category, created_at")
    .eq("profile_id", profile.id)
    .not("vehicle_id", "is", null);
  if (monthStart && monthEnd) {
    billsQuery = billsQuery.gte("created_at", monthStart).lte("created_at", `${monthEnd}T23:59:59`);
  }

  let expensesQuery = supabase
    .from("expense_entries")
    .select("id, note, notes, amount, vehicle_id, vehicle_category, created_at")
    .eq("profile_id", profile.id)
    .not("vehicle_id", "is", null);
  if (monthStart && monthEnd) {
    expensesQuery = expensesQuery.gte("created_at", monthStart).lte("created_at", `${monthEnd}T23:59:59`);
  }

  const [billsRes, expensesRes] = await Promise.all([billsQuery, expensesQuery]);

  const map = new Map<string, VehicleSpendSummary>();

  function ensureVehicle(vehicleId: string) {
    if (!map.has(vehicleId)) {
      map.set(vehicleId, { vehicleId, totalBills: 0, totalExpenses: 0, entries: [] });
    }
    return map.get(vehicleId)!;
  }

  for (const row of billsRes.data ?? []) {
    const vid = String(row.vehicle_id);
    const summary = ensureVehicle(vid);
    const amount = Number(row.amount);
    summary.totalBills += amount;
    summary.entries.push({
      id: String(row.id),
      source: "bill",
      label: String(row.note ?? row.notes ?? "Bill"),
      amount,
      date: String(row.created_at),
      vehicle_category: (row.vehicle_category as string | null) ?? null,
    });
  }

  for (const row of expensesRes.data ?? []) {
    const vid = String(row.vehicle_id);
    const summary = ensureVehicle(vid);
    const amount = Number(row.amount);
    summary.totalExpenses += amount;
    summary.entries.push({
      id: String(row.id),
      source: "expense",
      label: String(row.note ?? row.notes ?? "Expense"),
      amount,
      date: String(row.created_at),
      vehicle_category: (row.vehicle_category as string | null) ?? null,
    });
  }

  return { summaries: Array.from(map.values()) };
}

export type VehicleLinkedBill = {
  id: string;
  label: string;
  amount: number;
  billing_period: "monthly" | "quarterly" | "yearly";
  due_date: string | null;
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
    .select("id, note, notes, amount, billing_period, due_date, vehicle_category, created_at")
    .eq("profile_id", profile.id)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });

  if (error) return { bills: [], error: error.message };

  return {
    bills: (data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.note ?? row.notes ?? "Bill"),
      amount: Number(row.amount),
      billing_period:
        row.billing_period === "yearly"
          ? "yearly"
          : row.billing_period === "quarterly"
            ? "quarterly"
            : "monthly",
      due_date: (row.due_date as string | null) ?? null,
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
