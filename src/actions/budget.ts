"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BudgetState, ReminderDay } from "@/types/database.types";
import {
  hasPremiumProductAccess,
  hasProLevelProductAccess,
  normalizeDbTier,
  type SubscriptionTierId,
} from "@/lib/subscription-tier";

const VALID_REMINDER_DAYS: ReminderDay[] = [3, 1, 0];

function normalizeReminderDaysBefore(
  raw: unknown
): ReminderDay[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const filtered = raw
    .map((d) => (typeof d === "number" ? d : Number(d)))
    .filter((d): d is ReminderDay => VALID_REMINDER_DAYS.includes(d as ReminderDay));
  if (filtered.length === 0) return undefined;
  return [...new Set(filtered)].sort((a, b) => b - a) as ReminderDay[];
}
import { getExpenseCategories } from "@/actions/categories";
import { normalizeDueDateForStorage } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";

export async function getNetTakeHome(): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("net_take_home")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;
  const value = Number(profile.net_take_home);
  return value > 0 ? value : null;
}

export type ExpenseEntryRow = {
  id: string;
  category_id: string;
  amount: number;
  note?: string | null;
  due_date?: string | null;
  reminder_days_before?: number[] | null;
};

export type IncomeEntryRow = {
  id: string;
  category_key: string;
  amount: number;
  sort_order: number;
};

export type ExpenseData = {
  netTakeHome: number;
  /** Pro or Premium with an active subscription window — due dates, reminders, unlimited lists. */
  isSubscriber: boolean;
  subscriptionTier: SubscriptionTierId;
  hasPremiumAccess: boolean;
  /** True when the user had a Pro plan but it has expired (subscription_ends_at is in the past). */
  subscriptionExpired: boolean;
  incomeEntries: IncomeEntryRow[];
  entries: ExpenseEntryRow[];
  /** YYYY-MM used for paidEntryIds */
  paidMonth: string;
  /** Expense entry IDs marked paid for paidMonth */
  paidEntryIds: string[];
  /** Read-only view of a partner's expenses (account sharing). */
  readOnly?: boolean;
  grantorUserId?: string;
};

export async function loadExpenseData(paidMonth?: string): Promise<ExpenseData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, net_take_home, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;

  const now = new Date();
  const endsAt = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const isSub = Boolean(profile.is_subscriber);
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, isSub);
  const hasPremiumAccess = hasPremiumProductAccess(tier, endsIso, isSub);
  const subscriptionExpired = endsAt != null && endsAt <= now;

  const month = paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();

  const [
    { data: incomeRows },
    { data: entriesRaw },
    { data: paymentRows },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("id, category_key, amount, sort_order")
      .eq("profile_id", profile.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("expense_entries")
      .select("id, category_id, amount, note, due_date, reminder_days_before")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("expense_payments")
      .select("expense_entry_id")
      .eq("profile_id", profile.id)
      .eq("paid_month", month),
  ]);

  const incomeEntries: IncomeEntryRow[] = (incomeRows ?? []).map((row) => ({
    id: row.id,
    category_key: String(row.category_key ?? "salary"),
    amount: Number(row.amount),
    sort_order: Number(row.sort_order ?? 0),
  }));
  const totalFromIncome = incomeEntries.reduce((s, r) => s + r.amount, 0);
  const netTakeHome = incomeEntries.length > 0 ? totalFromIncome : Number(profile.net_take_home);

  let entries = entriesRaw ?? [];
  if (!hasProAccess) {
    const hasDueOrReminder = entries.some(
      (row) =>
        row.due_date != null ||
        (row.reminder_days_before != null &&
          (!Array.isArray(row.reminder_days_before) || row.reminder_days_before.length > 0))
    );
    if (hasDueOrReminder) {
      const { error: clearErr } = await supabase
        .from("expense_entries")
        .update({ due_date: null, reminder_days_before: null })
        .eq("profile_id", profile.id);
      if (!clearErr) {
        entries = entries.map((row) => ({
          ...row,
          due_date: null,
          reminder_days_before: null,
        }));
      }
    }
  }

  return {
    netTakeHome,
    isSubscriber: hasProAccess,
    subscriptionTier: tier,
    hasPremiumAccess,
    subscriptionExpired,
    incomeEntries,
    entries: entries.map((row) => ({
      id: row.id,
      category_id: String(row.category_id ?? ""),
      amount: Number(row.amount),
      note: row.note ?? undefined,
      due_date: row.due_date ?? undefined,
      reminder_days_before: normalizeReminderDaysBefore(row.reminder_days_before) ?? undefined,
    })),
    paidMonth: month,
    paidEntryIds: (paymentRows ?? []).map((r) => String(r.expense_entry_id)),
  };
}

/** Load another user's expense dashboard when they have shared access with you (read-only). */
export async function loadSharedExpenseData(
  grantorUserId: string,
  paidMonth?: string
): Promise<ExpenseData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: grantorProfile } = await supabase
    .from("profiles")
    .select("id, net_take_home, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", grantorUserId)
    .single();
  if (!grantorProfile) return null;

  const { data: share } = await supabase
    .from("account_shares")
    .select("id")
    .eq("grantor_profile_id", grantorProfile.id)
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted")
    .eq("can_view_expenses", true)
    .maybeSingle();
  if (!share) return null;

  const now = new Date();
  const endsAt = grantorProfile.subscription_ends_at
    ? new Date(grantorProfile.subscription_ends_at as string)
    : null;
  const gTier = normalizeDbTier(grantorProfile.subscription_tier as string | null);
  const gEndsIso = grantorProfile.subscription_ends_at as string | null;
  const gSub = Boolean(grantorProfile.is_subscriber);
  const hasProAccess = hasProLevelProductAccess(gTier, gEndsIso, gSub);
  const hasPremiumAccess = hasPremiumProductAccess(gTier, gEndsIso, gSub);
  const subscriptionExpired = endsAt != null && endsAt <= now;

  const month = paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();

  const [{ data: entries }, { data: paymentRows }] = await Promise.all([
    supabase
      .from("expense_entries")
      .select("id, category_id, amount, note, due_date, reminder_days_before")
      .eq("profile_id", grantorProfile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("expense_payments")
      .select("expense_entry_id")
      .eq("profile_id", grantorProfile.id)
      .eq("paid_month", month),
  ]);

  return {
    netTakeHome: Number(grantorProfile.net_take_home),
    isSubscriber: hasProAccess,
    subscriptionTier: gTier,
    hasPremiumAccess,
    subscriptionExpired,
    incomeEntries: [],
    entries: (entries ?? []).map((row) => ({
      id: row.id,
      category_id: String(row.category_id ?? ""),
      amount: Number(row.amount),
      note: row.note ?? undefined,
      due_date: hasProAccess ? (row.due_date ?? undefined) : undefined,
      reminder_days_before: hasProAccess
        ? normalizeReminderDaysBefore(row.reminder_days_before) ?? undefined
        : undefined,
    })),
    paidMonth: month,
    paidEntryIds: (paymentRows ?? []).map((r) => String(r.expense_entry_id)),
    readOnly: true,
    grantorUserId,
  };
}

export async function loadBudget(): Promise<BudgetState | null> {
  const data = await loadExpenseData();
  if (!data) return null;
  const categories = await getExpenseCategories();
  const expenses: Record<string, number> = categories.reduce(
    (acc, cat) => ({ ...acc, [cat.id]: 0 }),
    {}
  );
  data.entries.forEach((row) => {
    expenses[row.category_id] = (expenses[row.category_id] ?? 0) + row.amount;
  });
  return {
    netTakeHome: data.netTakeHome,
    expenses,
  };
}

export type IncomeEntryInput = { category_key: string; amount: number };

export async function saveIncomeEntries(rows: IncomeEntryInput[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insertErr || !newProfile) return { error: insertErr?.message ?? "Could not create profile." };
    profile = newProfile;
  }

  const validRows = rows
    .map((r) => ({ category_key: r.category_key || "salary", amount: Math.max(0, Number(r.amount) || 0) }))
    .filter((r) => r.amount > 0);

  const { error: delErr } = await supabase
    .from("income_entries")
    .delete()
    .eq("profile_id", profile.id);
  if (delErr) return { error: delErr.message };

  if (validRows.length > 0) {
    const insertRows = validRows.map((r, i) => ({
      profile_id: profile!.id,
      category_key: r.category_key,
      amount: r.amount,
      sort_order: i,
    }));
    const { error: insertErr } = await supabase.from("income_entries").insert(insertRows);
    if (insertErr) return { error: insertErr.message };
  }

  const total = validRows.reduce((s, r) => s + r.amount, 0);
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ net_take_home: total, updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (updateErr) return { error: updateErr.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/");
  return {};
}

export async function updateNetTakeHome(amount: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) return { error: `Auth: ${authError.message}` };
  if (!user) return { error: "Not logged in." };

  const value = Math.max(0, amount);

  let { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: `Fetch profile: ${fetchError.message}` };

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: value, currency: "PHP" })
      .select("id, net_take_home")
      .single();
    if (insertErr) return { error: `Save failed: ${insertErr.message}` };
    if (!newProfile) return { error: "Save failed: no profile returned." };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-expenses");
    revalidatePath("/");
    return {};
  }

  const { data: updated, error: updateErr } = await supabase
    .from("profiles")
    .update({ net_take_home: value, updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .eq("user_id", user.id)
    .select("net_take_home")
    .single();

  if (updateErr) return { error: `Save failed: ${updateErr.message}` };
  if (!updated) return { error: "Save failed: update did not apply. Check RLS policies." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/");
  return {};
}

export async function addExpense(
  categoryId: string,
  amount: number,
  note?: string | null,
  dueDate?: string | null,
  reminderDaysBefore?: ReminderDay[] | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  let { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id, is_subscriber, subscription_ends_at, subscription_tier")
      .single();
    if (insertErr || !newProfile) return { error: insertErr?.message ?? "Could not create profile." };
    profile = newProfile;
  }
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, Boolean(profile.is_subscriber));
  const dueRaw = dueDate?.trim() ?? "";
  const dueNorm = dueRaw ? normalizeDueDateForStorage(dueRaw) : null;
  if (dueRaw && !dueNorm) return { error: "Invalid due date." };
  const reminders = reminderDaysBefore?.length ? reminderDaysBefore : null;
  if (!hasProAccess && (dueNorm || reminders)) {
    return { error: "Due dates and reminders are available on Pro or Premium." };
  }
  const { error } = await supabase
    .from("expense_entries")
    .insert({
      profile_id: profile.id,
      category_id: categoryId,
      amount,
      ...(note != null && { note: note.trim() || null }),
      ...(dueNorm && { due_date: dueNorm }),
      ...(reminders && { reminder_days_before: reminders }),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/");
  return {};
}

export async function updateExpense(
  entryId: string,
  categoryId: string,
  amount: number,
  note?: string | null,
  dueDate?: string | null,
  reminderDaysBefore?: ReminderDay[] | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, Boolean(profile.is_subscriber));
  let due: string | null | undefined = undefined;
  if (dueDate !== undefined) {
    const raw = dueDate?.trim() ?? "";
    if (!raw) due = null;
    else {
      const norm = normalizeDueDateForStorage(raw);
      if (!norm) return { error: "Invalid due date." };
      due = norm;
    }
  }
  const reminders = reminderDaysBefore !== undefined ? (reminderDaysBefore?.length ? reminderDaysBefore : null) : undefined;
  if (!hasProAccess) {
    if (due !== undefined && due !== null) {
      return { error: "Due dates are available on Pro or Premium." };
    }
    if (reminders !== undefined && reminders !== null) {
      return { error: "Reminders are available on Pro or Premium." };
    }
  }
  const { error } = await supabase
    .from("expense_entries")
    .update({
      category_id: categoryId,
      amount,
      ...(note !== undefined && { note: note || null }),
      ...(due !== undefined && { due_date: due }),
      ...(reminders !== undefined && { reminder_days_before: reminders }),
    })
    .eq("id", entryId)
    .eq("profile_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/");
  return {};
}

export async function deleteExpense(entryId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };
  const { error } = await supabase
    .from("expense_entries")
    .delete()
    .eq("id", entryId)
    .eq("profile_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/");
  return {};
}

export async function saveBudget(state: BudgetState): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insertErr || !newProfile) return { error: insertErr?.message ?? "Could not create profile." };
    profile = newProfile;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      net_take_home: state.netTakeHome,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) return { error: updateError.message };

  await supabase.from("expense_entries").delete().eq("profile_id", profile.id);

  const rows = (Object.entries(state.expenses) as [string, number][])
    .filter(([, amount]) => amount > 0)
    .map(([category_id, amount]) => ({
      profile_id: profile.id,
      category_id,
      amount,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("expense_entries")
      .insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return {};
}

export type SubscriptionStatus = {
  hasProAccess: boolean;
  hasPremiumAccess: boolean;
  subscriptionTier: SubscriptionTierId;
  /** True only for paying subscribers (is_subscriber). False for free / comped access without billing. */
  isPaidTier: boolean;
  subscriptionEndsAt: string | null;
  isRecurring: boolean;
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const isSub = Boolean(profile.is_subscriber);
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, isSub);
  const hasPremiumAccess = hasPremiumProductAccess(tier, endsIso, isSub);
  const isPaidTier = Boolean(profile.is_subscriber);
  return {
    hasProAccess,
    hasPremiumAccess,
    subscriptionTier: tier,
    isPaidTier,
    subscriptionEndsAt: profile.subscription_ends_at ?? null,
    isRecurring: Boolean(profile.is_subscriber),
  };
}

/** Call after successful payment: grants 1 month of Pro from now (or extends from current end if still in period). */
export async function recordSubscriptionPayment(
  tier: "pro" | "premium" = "pro"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, subscription_ends_at")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };
  const now = new Date();
  const currentEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const startFrom = currentEnd != null && currentEnd > now ? currentEnd : now;
  const newEndsAt = new Date(startFrom);
  newEndsAt.setUTCMonth(newEndsAt.getUTCMonth() + 1);
  const { error } = await supabase
    .from("profiles")
    .update({
      is_subscriber: true,
      subscription_tier: tier,
      subscription_ends_at: newEndsAt.toISOString(),
    })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/account/subscription");
  revalidatePath("/");
  return {};
}

/** Server-only: grant 1 month Pro or Premium for a user by user_id (e.g. after PayMongo webhook or polling). */
export async function recordSubscriptionPaymentForUserId(
  userId: string,
  tier: "pro" | "premium" = "pro"
): Promise<{ error?: string }> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, subscription_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!profile) return { error: "Profile not found." };
  const now = new Date();
  const currentEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const startFrom = currentEnd != null && currentEnd > now ? currentEnd : now;
  const newEndsAt = new Date(startFrom);
  newEndsAt.setUTCMonth(newEndsAt.getUTCMonth() + 1);
  const { error } = await supabase
    .from("profiles")
    .update({
      is_subscriber: true,
      subscription_tier: tier,
      subscription_ends_at: newEndsAt.toISOString(),
    })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/account/subscription");
  revalidatePath("/");
  return {};
}

export async function unsubscribe(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };
  const { error } = await supabase
    .from("profiles")
    .update({ is_subscriber: false })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  revalidatePath("/account/subscription");
  revalidatePath("/");
  return {};
}
