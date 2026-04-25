"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReminderDay } from "@/types/database.types";
import {
  hasPremiumProductAccess,
  hasProLevelProductAccess,
  normalizeDbTier,
  type SubscriptionTierId,
} from "@/lib/subscription-tier";
import { normalizeDueDateForStorage } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";

const VALID_REMINDER_DAYS: ReminderDay[] = [3, 1, 0];

function normalizeReminderDaysBefore(raw: unknown): ReminderDay[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const filtered = raw
    .map((d) => (typeof d === "number" ? d : Number(d)))
    .filter((d): d is ReminderDay => VALID_REMINDER_DAYS.includes(d as ReminderDay));
  if (filtered.length === 0) return undefined;
  return [...new Set(filtered)].sort((a, b) => b - a) as ReminderDay[];
}

export type BillRow = {
  id: string;
  category_id: string;
  amount: number;
  note?: string | null;
  notes?: string | null;
  due_date: string;
  end_date?: string | null;
  billing_period: "monthly" | "quarterly" | "yearly";
  due_month?: number | null;
  reminder_days_before?: number[] | null;
  reminder_channel?: "email" | "in-app" | "both";
  account_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type BillsData = {
  bills: BillRow[];
  paidMonth: string;
  paidBillIds: string[];
  netTakeHome: number;
  isSubscriber: boolean;
  subscriptionTier: SubscriptionTierId;
  hasPremiumAccess: boolean;
  subscriptionExpired: boolean;
};

export async function loadBillsData(paidMonth?: string): Promise<BillsData | null> {
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
  const endsAt = profile.subscription_ends_at ? new Date(profile.subscription_ends_at as string) : null;
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const isSub = Boolean(profile.is_subscriber);
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, isSub);
  const hasPremiumAccess = hasPremiumProductAccess(tier, endsIso, isSub);
  const subscriptionExpired = endsAt != null && endsAt <= now;

  const month = paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();

  const [{ data: billsRaw }, { data: paymentRows }, { data: incomeRows }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, category_id, amount, billing_period, due_month, note, notes, due_date, end_date, reminder_days_before, reminder_channel, account_id, created_at, updated_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bill_payments")
      .select("bill_id")
      .eq("profile_id", profile.id)
      .eq("paid_month", month),
    supabase
      .from("income_entries")
      .select("amount")
      .eq("profile_id", profile.id),
  ]);

  let bills = billsRaw ?? [];

  if (!hasProAccess) {
    const hasReminders = bills.some(
      (row) =>
        row.reminder_days_before != null &&
        (!Array.isArray(row.reminder_days_before) || row.reminder_days_before.length > 0),
    );
    if (hasReminders) {
      const { error: clearErr } = await supabase
        .from("bills")
        .update({ reminder_days_before: null })
        .eq("profile_id", profile.id);
      if (!clearErr) {
        bills = bills.map((row) => ({ ...row, reminder_days_before: null }));
      }
    }
  }

  const totalFromIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const netTakeHome =
    incomeRows && incomeRows.length > 0 ? totalFromIncome : Number(profile.net_take_home);

  return {
    bills: bills.map((row) => ({
      id: row.id,
      category_id: String(row.category_id ?? ""),
      amount: Number(row.amount),
      billing_period:
        row.billing_period === "yearly"
          ? "yearly"
          : row.billing_period === "quarterly"
            ? "quarterly"
            : "monthly",
      due_month: row.due_month != null ? Number(row.due_month) : undefined,
      note: row.note ?? undefined,
      notes: row.notes ?? undefined,
      due_date: String(row.due_date),
      end_date: row.end_date ? String(row.end_date) : null,
      reminder_days_before: normalizeReminderDaysBefore(row.reminder_days_before) ?? undefined,
      reminder_channel: (row.reminder_channel as "email" | "in-app" | "both") ?? "both",
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    paidMonth: month,
    paidBillIds: (paymentRows ?? []).map((r) => r.bill_id as string),
    netTakeHome,
    isSubscriber: hasProAccess,
    subscriptionTier: tier,
    hasPremiumAccess,
    subscriptionExpired,
  };
}

export async function toggleBillPayment(
  billId: string,
  paidMonth: string,
): Promise<{ error?: string; paid?: boolean }> {
  if (!/^\d{4}-\d{2}$/.test(paidMonth)) return { error: "invalid_month" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "no_profile" };

  const { data: existing } = await supabase
    .from("bill_payments")
    .select("id")
    .eq("bill_id", billId)
    .eq("profile_id", profile.id)
    .eq("paid_month", paidMonth)
    .maybeSingle();

  if (existing) {
    await supabase.from("bill_payments").delete().eq("id", existing.id);
    revalidatePath("/dashboard/bills");
    return { paid: false };
  }

  const { error } = await supabase
    .from("bill_payments")
    .insert({ bill_id: billId, profile_id: profile.id, paid_month: paidMonth });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bills");
  return { paid: true };
}

export async function addBill(
  categoryId: string,
  amount: number,
  note: string,
  dueDate: string,
  billingPeriod: "monthly" | "quarterly" | "yearly" = "monthly",
  dueMonth?: number,
  notes?: string,
  reminderDaysBefore?: number[],
  reminderChannel: "email" | "in-app" | "both" = "both",
  endDate?: string,
  accountId?: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "no_profile" };

  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, Boolean(profile.is_subscriber));

  const normalizedDueDate = normalizeDueDateForStorage(dueDate);
  if (!normalizedDueDate) return { error: "invalid_due_date" };

  const reminders = hasProAccess ? normalizeReminderDaysBefore(reminderDaysBefore) : undefined;

  const { error } = await supabase.from("bills").insert({
    profile_id: profile.id,
    category_id: categoryId,
    amount,
    note: note.trim() || null,
    notes: notes?.trim() || null,
    due_date: normalizedDueDate,
    end_date: endDate ?? null,
    billing_period: billingPeriod,
    due_month: billingPeriod === "yearly" ? (dueMonth ?? null) : null,
    reminder_days_before: reminders ?? null,
    reminder_channel: reminders ? reminderChannel : "both",
    account_id: accountId ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bills");
  return {};
}

export async function updateBill(
  billId: string,
  categoryId: string,
  amount: number,
  note: string,
  dueDate: string,
  billingPeriod: "monthly" | "quarterly" | "yearly" = "monthly",
  dueMonth?: number,
  notes?: string,
  reminderDaysBefore?: number[],
  reminderChannel: "email" | "in-app" | "both" = "both",
  endDate?: string,
  accountId?: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_subscriber, subscription_ends_at, subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "no_profile" };

  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const endsIso = profile.subscription_ends_at as string | null;
  const hasProAccess = hasProLevelProductAccess(tier, endsIso, Boolean(profile.is_subscriber));

  const normalizedDueDate = normalizeDueDateForStorage(dueDate);
  if (!normalizedDueDate) return { error: "invalid_due_date" };

  const reminders = hasProAccess ? normalizeReminderDaysBefore(reminderDaysBefore) : undefined;

  const { error } = await supabase
    .from("bills")
    .update({
      category_id: categoryId,
      amount,
      note: note.trim() || null,
      notes: notes?.trim() || null,
      due_date: normalizedDueDate,
      end_date: endDate ?? null,
      billing_period: billingPeriod,
      due_month: billingPeriod === "yearly" ? (dueMonth ?? null) : null,
      reminder_days_before: reminders ?? null,
      reminder_channel: reminders ? reminderChannel : "both",
      account_id: accountId ?? null,
    })
    .eq("id", billId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bills");
  return {};
}

export async function deleteBill(billId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "no_profile" };

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("id", billId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bills");
  return {};
}
