"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GoalType = "short_term" | "long_term" | "lifetime";

export type GoalEntryRow = {
  id: string;
  name: string;
  date_set_month: number;
  date_set_year: number;
  date_achieved_month: number | null;
  date_achieved_year: number | null;
  goal_type: GoalType;
  notes: string | null;
};

function normalizeGoalType(raw: string | null | undefined): GoalType | null {
  if (raw === "short_term" || raw === "long_term" || raw === "lifetime") return raw;
  return null;
}

function isAchievedGoalRow(g: GoalEntryRow): boolean {
  return g.date_achieved_month != null && g.date_achieved_year != null;
}

export async function loadGoals(): Promise<{ goals: GoalEntryRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { goals: [], error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) return { goals: [] };

  const { data: rows, error } = await supabase
    .from("goal_entries")
    .select("id, name, date_set_month, date_set_year, date_achieved_month, date_achieved_year, goal_type, notes")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) return { goals: [], error: error.message };

  const goals: GoalEntryRow[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    date_set_month: Number(r.date_set_month ?? 1),
    date_set_year: Number(r.date_set_year ?? new Date().getFullYear()),
    date_achieved_month: r.date_achieved_month != null ? Number(r.date_achieved_month) : null,
    date_achieved_year: r.date_achieved_year != null ? Number(r.date_achieved_year) : null,
    goal_type: normalizeGoalType(String(r.goal_type)) ?? "short_term",
    notes: r.notes != null ? String(r.notes) : null,
  }));

  // Achieved goals first (most recently achieved first); then in-progress by type and name.
  const achievementRank = (g: GoalEntryRow) =>
    g.date_achieved_year != null && g.date_achieved_month != null
      ? g.date_achieved_year * 12 + g.date_achieved_month
      : 0;
  const typeRank: Record<GoalType, number> = {
    short_term: 0,
    long_term: 1,
    lifetime: 2,
  };
  goals.sort((a, b) => {
    const aDone = isAchievedGoalRow(a);
    const bDone = isAchievedGoalRow(b);
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (aDone && bDone) {
      const diff = achievementRank(b) - achievementRank(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    }
    const ta = typeRank[a.goal_type];
    const tb = typeRank[b.goal_type];
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  return { goals };
}

type GoalInput = {
  name: string;
  date_set_month: number;
  date_set_year: number;
  date_achieved_month: number | null;
  date_achieved_year: number | null;
  goal_type: GoalType;
  notes: string | null;
};

function validateInput(input: GoalInput): string | null {
  if (!input.name.trim()) return "Goal name is required.";
  if (!normalizeGoalType(input.goal_type)) return "Goal type is required.";
  if (!Number.isFinite(input.date_set_month) || input.date_set_month < 1 || input.date_set_month > 12) {
    return "Date set: choose a valid month.";
  }
  if (!Number.isFinite(input.date_set_year) || input.date_set_year < 1900 || input.date_set_year > 2100) {
    return "Date set: choose a valid year.";
  }
  const m = input.date_achieved_month;
  const y = input.date_achieved_year;
  if ((m == null) !== (y == null)) return "Set both month and year for date achieved, or leave both empty.";
  if (m != null && y != null) {
    if (m < 1 || m > 12) return "Invalid month.";
    if (y < 1900 || y > 2100) return "Invalid year.";
  }
  return null;
}

export async function createGoal(input: GoalInput): Promise<{ error?: string }> {
  const err = validateInput(input);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  let { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) {
    const { data: inserted, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insErr || !inserted) return { error: insErr?.message ?? "Could not create profile." };
    profile = inserted;
  }

  const { error } = await supabase.from("goal_entries").insert({
    profile_id: profile.id,
    name: input.name.trim(),
    date_set_month: input.date_set_month,
    date_set_year: input.date_set_year,
    date_achieved_month: input.date_achieved_month,
    date_achieved_year: input.date_achieved_year,
    goal_type: input.goal_type,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/my-goals");
  return {};
}

export async function updateGoal(goalId: string, input: GoalInput): Promise<{ error?: string }> {
  const err = validateInput(input);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("goal_entries")
    .update({
      name: input.name.trim(),
      date_set_month: input.date_set_month,
      date_set_year: input.date_set_year,
      date_achieved_month: input.date_achieved_month,
      date_achieved_year: input.date_achieved_year,
      goal_type: input.goal_type,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/my-goals");
  return {};
}

export async function deleteGoal(goalId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase.from("goal_entries").delete().eq("id", goalId).eq("profile_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/my-goals");
  return {};
}
