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
  target_amount: number | null;
  total_deposited: number;
};

export type GoalDepositRow = {
  id: string;
  goal_id: string;
  amount: number;
  note: string | null;
  deposited_at: string;
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

  const [{ data: rows, error }, { data: depositRows }] = await Promise.all([
    supabase
      .from("goal_entries")
      .select(
        "id, name, date_set_month, date_set_year, date_achieved_month, date_achieved_year, goal_type, notes, target_amount"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("goal_deposits")
      .select("goal_id, amount")
      .eq("profile_id", profile.id),
  ]);

  if (error) return { goals: [], error: error.message };

  const totalsMap = new Map<string, number>();
  for (const d of depositRows ?? []) {
    const gid = String(d.goal_id);
    totalsMap.set(gid, (totalsMap.get(gid) ?? 0) + Number(d.amount));
  }

  const goals: GoalEntryRow[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    date_set_month: Number(r.date_set_month ?? 1),
    date_set_year: Number(r.date_set_year ?? new Date().getFullYear()),
    date_achieved_month: r.date_achieved_month != null ? Number(r.date_achieved_month) : null,
    date_achieved_year: r.date_achieved_year != null ? Number(r.date_achieved_year) : null,
    goal_type: normalizeGoalType(String(r.goal_type)) ?? "short_term",
    notes: r.notes != null ? String(r.notes) : null,
    target_amount: r.target_amount != null ? Number(r.target_amount) : null,
    total_deposited: totalsMap.get(String(r.id)) ?? 0,
  }));

  const achievementRank = (g: GoalEntryRow) =>
    g.date_achieved_year != null && g.date_achieved_month != null
      ? g.date_achieved_year * 12 + g.date_achieved_month
      : 0;
  const typeRank: Record<GoalType, number> = { short_term: 0, long_term: 1, lifetime: 2 };

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

export async function loadGoalDeposits(
  goalId: string
): Promise<{ deposits: GoalDepositRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { deposits: [], error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) return { deposits: [] };

  const { data: rows, error } = await supabase
    .from("goal_deposits")
    .select("id, goal_id, amount, note, deposited_at")
    .eq("goal_id", goalId)
    .eq("profile_id", profile.id)
    .order("deposited_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { deposits: [], error: error.message };

  const deposits: GoalDepositRow[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    goal_id: String(r.goal_id),
    amount: Number(r.amount),
    note: r.note != null ? String(r.note) : null,
    deposited_at: String(r.deposited_at),
  }));

  return { deposits };
}

type GoalInput = {
  name: string;
  date_set_month: number;
  date_set_year: number;
  date_achieved_month: number | null;
  date_achieved_year: number | null;
  goal_type: GoalType;
  notes: string | null;
  target_amount: number | null;
};

function validateInput(input: GoalInput): string | null {
  if (!input.name.trim()) return "Goal name is required.";
  if (!normalizeGoalType(input.goal_type)) return "Goal type is required.";
  if (!Number.isFinite(input.date_set_month) || input.date_set_month < 1 || input.date_set_month > 12)
    return "Date set: choose a valid month.";
  if (!Number.isFinite(input.date_set_year) || input.date_set_year < 1900 || input.date_set_year > 2100)
    return "Date set: choose a valid year.";
  const m = input.date_achieved_month;
  const y = input.date_achieved_year;
  if ((m == null) !== (y == null)) return "Set both month and year for date achieved, or leave both empty.";
  if (m != null && y != null) {
    if (m < 1 || m > 12) return "Invalid month.";
    if (y < 1900 || y > 2100) return "Invalid year.";
  }
  if (input.target_amount != null && (input.target_amount <= 0 || !Number.isFinite(input.target_amount)))
    return "Target amount must be a positive number.";
  return null;
}

async function getOrCreateProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  let { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!profile) {
    const { data: inserted, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: userId, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insErr || !inserted) return null;
    profile = inserted;
  }
  return profile;
}

export async function createGoal(input: GoalInput): Promise<{ error?: string }> {
  const err = validateInput(input);
  if (err) return { error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const profile = await getOrCreateProfile(supabase, user.id);
  if (!profile) return { error: "Could not create profile." };

  const { error } = await supabase.from("goal_entries").insert({
    profile_id: profile.id,
    name: input.name.trim(),
    date_set_month: input.date_set_month,
    date_set_year: input.date_set_year,
    date_achieved_month: input.date_achieved_month,
    date_achieved_year: input.date_achieved_year,
    goal_type: input.goal_type,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    target_amount: input.target_amount,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
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
      target_amount: input.target_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
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
  revalidatePath("/dashboard/goals");
  return {};
}

export async function addGoalDeposit(
  goalId: string,
  input: { amount: number; note: string | null; deposited_at: string }
): Promise<{ error?: string }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    return { error: "Amount must be a positive number." };
  if (!input.deposited_at) return { error: "Deposit date is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase.from("goal_deposits").insert({
    goal_id: goalId,
    profile_id: profile.id,
    amount: input.amount,
    note: input.note?.trim() ? input.note.trim() : null,
    deposited_at: input.deposited_at,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}

export async function deleteGoalDeposit(depositId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("goal_deposits")
    .delete()
    .eq("id", depositId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/goals");
  return {};
}
