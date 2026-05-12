"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { ReminderDay } from "@/types/database.types";
import {
  hasPremiumProductAccess,
  hasProLevelProductAccess,
  normalizeDbTier,
  FREE_TIER_MAX_BILL_REMINDERS,
  type SubscriptionTierId,
} from "@/lib/subscription-tier";
import { normalizeDueDateForStorage } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { TRANSPORT_EXPENSE_CATEGORY_ID } from "@/lib/constants/expense-categories";
import { isVehicleExpenseCategoryValue } from "@/lib/constants/vehicle-categories";

const VALID_REMINDER_DAYS: ReminderDay[] = [5, 4, 3, 2, 1, 0];

function extractBillIdFromDedupeKey(key: string): string | null {
  const m = key.match(/^bill:([^:]+):/);
  return m ? m[1] : null;
}

async function getLockedFreeReminderBillId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_notifications")
    .select("dedupe_key")
    .eq("user_id", userId)
    .like("dedupe_key", "bill:%")
    .limit(1);
  for (const row of data ?? []) {
    const id = extractBillIdFromDedupeKey(row.dedupe_key as string);
    if (id) return id;
  }
  return null;
}

function normalizeReminderDaysBefore(raw: unknown): ReminderDay[] | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const filtered = raw
    .map((d) => (typeof d === "number" ? d : Number(d)))
    .filter((d): d is ReminderDay => VALID_REMINDER_DAYS.includes(d as ReminderDay));
  if (filtered.length === 0) return undefined;
  return [...new Set(filtered)].sort((a, b) => b - a) as ReminderDay[];
}

function resolveBillVehicleFields(
  categoryId: string,
  vehicleId: string | null | undefined,
  vehicleCategory: string | null | undefined,
):
  | { error: string }
  | { vehicle_id: string | null; vehicle_category: string | null } {
  if (categoryId !== TRANSPORT_EXPENSE_CATEGORY_ID) {
    return { vehicle_id: null, vehicle_category: null };
  }
  const vid = vehicleId?.trim() || null;
  if (!vid) {
    return { vehicle_id: null, vehicle_category: null };
  }
  const raw = vehicleCategory?.trim() || null;
  if (!raw || !isVehicleExpenseCategoryValue(raw)) {
    return { error: "Select a vehicle category when linking this planned expense to a vehicle." };
  }
  return { vehicle_id: vid, vehicle_category: raw };
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
  vehicle_id?: string | null;
  vehicle_category?: string | null;
  is_auto_debit: boolean;
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
  /** Bill ID that permanently holds the free reminder slot (reminder already sent for it). Free tier only; undefined for pro/premium. */
  lockedFreeReminderBillId?: string;
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

  const [{ data: billsRaw }, { data: paymentRows }, { data: incomeRows }, { data: lockLogs }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, category_id, amount, billing_period, due_month, note, notes, due_date, end_date, reminder_days_before, reminder_channel, account_id, vehicle_id, vehicle_category, is_auto_debit, created_at, updated_at")
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
    hasProAccess
      ? Promise.resolve({ data: null })
      : supabase
          .from("user_notifications")
          .select("dedupe_key")
          .eq("user_id", user.id)
          .like("dedupe_key", "bill:%")
          .limit(1),
  ]);

  let bills = billsRaw ?? [];

  let lockedFreeReminderBillId: string | undefined;
  if (!hasProAccess) {
    for (const row of lockLogs ?? []) {
      const id = extractBillIdFromDedupeKey(row.dedupe_key as string);
      if (id) { lockedFreeReminderBillId = id; break; }
    }
  }

  if (!hasProAccess) {
    const billsWithReminders = bills.filter(
      (row) =>
        row.reminder_days_before != null &&
        Array.isArray(row.reminder_days_before) &&
        row.reminder_days_before.length > 0,
    );
    if (billsWithReminders.length > FREE_TIER_MAX_BILL_REMINDERS) {
      const toClearIds = billsWithReminders.slice(FREE_TIER_MAX_BILL_REMINDERS).map((b) => b.id);
      const { error: clearErr } = await supabase
        .from("bills")
        .update({ reminder_days_before: null })
        .in("id", toClearIds);
      if (!clearErr) {
        bills = bills.map((row) =>
          toClearIds.includes(row.id) ? { ...row, reminder_days_before: null } : row,
        );
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
      account_id: row.account_id ?? undefined,
      vehicle_id: (row.vehicle_id as string | null) ?? null,
      vehicle_category: (row.vehicle_category as string | null) ?? null,
      is_auto_debit: Boolean(row.is_auto_debit),
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
    lockedFreeReminderBillId,
  };
}

export type SharedBillsData = {
  bills: BillRow[];
  paidMonth: string;
  paidBillIds: string[];
  grantorUserId: string;
};

export async function loadSharedBillsData(
  grantorUserId: string,
  paidMonth?: string,
): Promise<SharedBillsData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: grantorProfile } = await supabase
    .from("profiles")
    .select("id")
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

  const month = paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();

  const [{ data: billsRaw }, { data: paymentRows }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, category_id, amount, billing_period, due_month, note, notes, due_date, end_date, account_id, is_auto_debit, created_at, updated_at")
      .eq("profile_id", grantorProfile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bill_payments")
      .select("bill_id")
      .eq("profile_id", grantorProfile.id)
      .eq("paid_month", month),
  ]);

  return {
    bills: (billsRaw ?? []).map((row) => ({
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
      account_id: row.account_id ?? undefined,
      is_auto_debit: Boolean(row.is_auto_debit),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    paidMonth: month,
    paidBillIds: (paymentRows ?? []).map((r) => r.bill_id as string),
    grantorUserId,
  };
}

export async function granteeSharedToggleBillPayment(
  grantorUserId: string,
  billId: string,
  paidMonth: string,
): Promise<{ error?: string; paid?: boolean }> {
  if (!/^\d{4}-\d{2}$/.test(paidMonth)) return { error: "Invalid month." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: grantorProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", grantorUserId)
    .single();
  if (!grantorProfile) return { error: "Account not found." };

  const { data: share } = await supabase
    .from("account_shares")
    .select("id")
    .eq("grantor_profile_id", grantorProfile.id)
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted")
    .eq("can_view_expenses", true)
    .maybeSingle();
  if (!share) return { error: "No shared access to this account." };

  const srClient = createServiceRoleClient();

  const { data: existing } = await srClient
    .from("bill_payments")
    .select("id")
    .eq("bill_id", billId)
    .eq("profile_id", grantorProfile.id)
    .eq("paid_month", paidMonth)
    .maybeSingle();

  if (existing) {
    await srClient.from("bill_payments").delete().eq("id", existing.id);
    revalidatePath(`/account/shared/${grantorUserId}/expenses`);
    return { paid: false };
  }

  const { error } = await srClient
    .from("bill_payments")
    .insert({ bill_id: billId, profile_id: grantorProfile.id, paid_month: paidMonth });

  if (error) return { error: error.message };
  revalidatePath(`/account/shared/${grantorUserId}/expenses`);
  return { paid: true };
}

export type ToggleBillPaymentResult = {
  error?: string;
  paid?: boolean;
  /** Set when the toggle failed because the linked account does not have enough balance. */
  insufficientBalance?: { accountId: string; available: number; required: number };
};

export async function toggleBillPayment(
  billId: string,
  paidMonth: string,
): Promise<ToggleBillPaymentResult> {
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
    // Cascading FK on bill_payment_id will also remove the auto-created
    // account_transaction and expense_entry from the original mark-paid action.
    await supabase.from("bill_payments").delete().eq("id", existing.id);
    revalidatePath("/dashboard/planned-expenses");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/expenses");
    return { paid: false };
  }

  const { data: bill, error: billErr } = await supabase
    .from("bills")
    .select("id, amount, account_id, category_id, note")
    .eq("id", billId)
    .eq("profile_id", profile.id)
    .single();
  if (billErr || !bill) return { error: "bill_not_found" };

  const billAmount = Number(bill.amount);
  const accountId = (bill.account_id as string | null) ?? null;

  if (accountId) {
    const [{ data: account }, { data: txRows }] = await Promise.all([
      supabase
        .from("accounts")
        .select("starting_balance")
        .eq("id", accountId)
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("account_transactions")
        .select("amount")
        .eq("account_id", accountId)
        .eq("profile_id", profile.id),
    ]);
    if (!account) return { error: "account_not_found" };

    const balance =
      Number(account.starting_balance ?? 0) +
      (txRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

    if (balance < billAmount) {
      return {
        error: "insufficient_balance",
        insufficientBalance: { accountId, available: balance, required: billAmount },
      };
    }
  }

  const { data: payment, error: payErr } = await supabase
    .from("bill_payments")
    .insert({ bill_id: billId, profile_id: profile.id, paid_month: paidMonth })
    .select("id")
    .single();
  if (payErr || !payment) return { error: payErr?.message ?? "could_not_mark_paid" };

  if (accountId) {
    const description = (bill.note as string | null)?.trim() || "Planned expense";
    const occurredAt = new Date().toISOString();

    const [{ error: txErr }, { error: expErr }] = await Promise.all([
      supabase.from("account_transactions").insert({
        profile_id: profile.id,
        account_id: accountId,
        type: "expense",
        amount: -Math.abs(billAmount),
        description,
        occurred_at: occurredAt,
        bill_payment_id: payment.id,
      }),
      supabase.from("expense_entries").insert({
        profile_id: profile.id,
        category_id: bill.category_id as string,
        amount: billAmount,
        note: description,
        account_id: accountId,
        bill_payment_id: payment.id,
      }),
    ]);

    if (txErr || expErr) {
      // Roll back the bill_payment so the user can retry; cascade removes any partial side rows.
      await supabase.from("bill_payments").delete().eq("id", payment.id);
      return { error: txErr?.message ?? expErr?.message ?? "could_not_record_payment" };
    }
  }

  revalidatePath("/dashboard/planned-expenses");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/expenses");
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
  vehicleId?: string | null,
  vehicleCategory?: string | null,
  isAutoDebit = false,
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

  const resolvedVehicle = resolveBillVehicleFields(categoryId, vehicleId, vehicleCategory);
  if ("error" in resolvedVehicle) return { error: resolvedVehicle.error };

  let reminders: ReturnType<typeof normalizeReminderDaysBefore>;
  if (hasProAccess) {
    reminders = normalizeReminderDaysBefore(reminderDaysBefore);
  } else if (reminderDaysBefore && reminderDaysBefore.length > 0) {
    const lockedId = await getLockedFreeReminderBillId(supabase, user.id);
    if (!lockedId) {
      const { count } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .not("reminder_days_before", "is", null);
      if ((count ?? 0) < FREE_TIER_MAX_BILL_REMINDERS) {
        reminders = normalizeReminderDaysBefore(reminderDaysBefore);
      }
    }
    // If lockedId exists: reminder blocked — slot permanently taken by another bill
  }

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
    vehicle_id: resolvedVehicle.vehicle_id,
    vehicle_category: resolvedVehicle.vehicle_category,
    is_auto_debit: isAutoDebit,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/planned-expenses");
  revalidatePath("/dashboard/fuel");
  revalidatePath("/dashboard/vehicles");
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
  vehicleId?: string | null,
  vehicleCategory?: string | null,
  isAutoDebit = false,
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

  const resolvedVehicle = resolveBillVehicleFields(categoryId, vehicleId, vehicleCategory);
  if ("error" in resolvedVehicle) return { error: resolvedVehicle.error };

  let reminders: ReturnType<typeof normalizeReminderDaysBefore>;
  if (hasProAccess) {
    reminders = normalizeReminderDaysBefore(reminderDaysBefore);
  } else if (reminderDaysBefore && reminderDaysBefore.length > 0) {
    const lockedId = await getLockedFreeReminderBillId(supabase, user.id);
    if (lockedId) {
      // Only the locked bill may set/keep its reminder
      if (lockedId === billId) {
        reminders = normalizeReminderDaysBefore(reminderDaysBefore);
      }
    } else {
      const { count } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .neq("id", billId)
        .not("reminder_days_before", "is", null);
      if ((count ?? 0) < FREE_TIER_MAX_BILL_REMINDERS) {
        reminders = normalizeReminderDaysBefore(reminderDaysBefore);
      }
    }
  }

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
      vehicle_id: resolvedVehicle.vehicle_id,
      vehicle_category: resolvedVehicle.vehicle_category,
      is_auto_debit: isAutoDebit,
    })
    .eq("id", billId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/planned-expenses");
  revalidatePath("/dashboard/fuel");
  revalidatePath("/dashboard/vehicles");
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
  revalidatePath("/dashboard/planned-expenses");
  revalidatePath("/dashboard/vehicles");
  return {};
}
