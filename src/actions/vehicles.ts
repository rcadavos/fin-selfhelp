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
  revalidatePath("/dashboard/gas");
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
  revalidatePath("/dashboard/gas");
  return {};
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
  revalidatePath("/dashboard/gas");
  return {};
}
