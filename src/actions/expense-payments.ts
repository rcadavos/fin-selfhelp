"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRecentPaidMonths } from "@/lib/paid-month";

export type PaymentMonthStats = {
  month: string;
  paidCount: number;
  totalCount: number;
};

async function getProfileId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<
  { error: null; profileId: string } | { error: string; profileId: null }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." as const, profileId: null };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (error || !profile) return { error: "Profile not found." as const, profileId: null };
  return { error: null, profileId: profile.id as string };
}

/** Mark paid for month, or unmark if already paid. */
export async function toggleExpensePayment(
  expenseEntryId: string,
  paidMonth: string
): Promise<{ error?: string; paid?: boolean }> {
  if (!/^\d{4}-\d{2}$/.test(paidMonth)) {
    return { error: "Invalid month." };
  }
  const supabase = await createClient();
  const { error: authErr, profileId } = await getProfileId(supabase);
  if (authErr || !profileId) return { error: authErr ?? "Not logged in." };

  const { data: entry, error: entryErr } = await supabase
    .from("expense_entries")
    .select("id")
    .eq("id", expenseEntryId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (entryErr || !entry) return { error: "Expense not found." };

  const { data: existing } = await supabase
    .from("expense_payments")
    .select("id")
    .eq("expense_entry_id", expenseEntryId)
    .eq("profile_id", profileId)
    .eq("paid_month", paidMonth)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("expense_payments")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");
    return { paid: false };
  }

  const { error } = await supabase.from("expense_payments").insert({
    expense_entry_id: expenseEntryId,
    profile_id: profileId,
    paid_month: paidMonth,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  return { paid: true };
}

/** Paid entry IDs for a given month (for dashboard). */
export async function getPaidEntryIdsForMonth(
  paidMonth: string
): Promise<{ error?: string; ids?: string[] }> {
  if (!/^\d{4}-\d{2}$/.test(paidMonth)) {
    return { error: "Invalid month." };
  }
  const supabase = await createClient();
  const { error: authErr, profileId } = await getProfileId(supabase);
  if (authErr || !profileId) return { error: authErr ?? "Not logged in." };

  const { data, error } = await supabase
    .from("expense_payments")
    .select("expense_entry_id")
    .eq("profile_id", profileId)
    .eq("paid_month", paidMonth);
  if (error) return { error: error.message };
  return { ids: (data ?? []).map((r) => r.expense_entry_id as string) };
}

/** Last N months: paid count vs total expense rows (current snapshot). */
export async function getPaymentHistoryMonths(
  months = 6
): Promise<{ error?: string; stats?: PaymentMonthStats[] }> {
  const supabase = await createClient();
  const { error: authErr, profileId } = await getProfileId(supabase);
  if (authErr || !profileId) return { error: authErr ?? "Not logged in." };

  const { count: totalCount, error: countErr } = await supabase
    .from("expense_entries")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if (countErr) return { error: countErr.message };
  const total = totalCount ?? 0;

  const monthKeys = getRecentPaidMonths(months);
  const stats: PaymentMonthStats[] = [];

  for (const month of monthKeys) {
    const { count, error } = await supabase
      .from("expense_payments")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("paid_month", month);
    if (error) return { error: error.message };
    stats.push({ month, paidCount: count ?? 0, totalCount: total });
  }

  return { stats };
}

/** Payment history for a partner's profile when they shared expenses with you. */
export async function getPaymentHistoryMonthsForGrantor(
  grantorUserId: string,
  months = 6
): Promise<{ error?: string; stats?: PaymentMonthStats[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const profileId = grantorProfile.id as string;

  const { count: totalCount, error: countErr } = await supabase
    .from("expense_entries")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if (countErr) return { error: countErr.message };
  const total = totalCount ?? 0;

  const monthKeys = getRecentPaidMonths(months);
  const stats: PaymentMonthStats[] = [];

  for (const month of monthKeys) {
    const { count, error } = await supabase
      .from("expense_payments")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("paid_month", month);
    if (error) return { error: error.message };
    stats.push({ month, paidCount: count ?? 0, totalCount: total });
  }

  return { stats };
}

function parseGranteeToggleRpc(data: unknown): { ok?: boolean; paid?: boolean; error?: string } | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as { ok?: boolean; paid?: boolean; error?: string };
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as { ok?: boolean; paid?: boolean; error?: string };
  }
  return null;
}

/** Grantee marks partner bill paid/unpaid for the given month (same rows as owner’s toggleExpensePayment). */
export async function granteeSharedToggleExpensePayment(
  grantorUserId: string,
  expenseEntryId: string,
  paidMonth: string
): Promise<{ error?: string; paid?: boolean }> {
  if (!/^\d{4}-\d{2}$/.test(paidMonth)) {
    return { error: "Invalid month." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: grantorProfile } = await supabase.from("profiles").select("id").eq("user_id", grantorUserId).single();
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

  const { data, error } = await supabase.rpc("grantee_toggle_expense_payment", {
    p_expense_entry_id: expenseEntryId,
    p_paid_month: paidMonth,
  });
  if (error) return { error: error.message };
  const result = parseGranteeToggleRpc(data);
  if (!result?.ok) return { error: result?.error?.replace(/_/g, " ") ?? "Could not update payment." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/account/shared");
  revalidatePath(`/account/shared/${grantorUserId}/expenses`);

  return { paid: result.paid };
}

export type MonthlyBreakdownPoint = {
  month: string;
  bills: number;
  expenses: number;
  savings: number;
};

/** Last N months of Bills / Expenses / Savings totals. Single DB round-trip. */
export async function getMonthlyBreakdown(
  months = 6
): Promise<{ error?: string; stats?: MonthlyBreakdownPoint[] }> {
  const supabase = await createClient();
  const { error: authErr, profileId } = await getProfileId(supabase);
  if (authErr || !profileId) return { error: authErr ?? "Not logged in." };

  const [{ data: expenseRows, error }, { data: billRows }, { data: billPaymentRows }] = await Promise.all([
    supabase
      .from("expense_entries")
      .select("amount, due_date, category_id, billing_period, created_at")
      .eq("profile_id", profileId),
    supabase
      .from("bills")
      .select("id, amount, billing_period, category_id, created_at")
      .eq("profile_id", profileId),
    supabase
      .from("bill_payments")
      .select("bill_id, paid_month")
      .eq("profile_id", profileId),
  ]);
  if (error) return { error: error.message };

  const allEntries = expenseRows ?? [];
  const allBills = billRows ?? [];
  const allBillPayments = billPaymentRows ?? [];
  const monthKeys = getRecentPaidMonths(months);

  const stats: MonthlyBreakdownPoint[] = monthKeys.map((month) => {
    const [y, m] = month.split("-").map(Number);
    const nextYear = m === 12 ? y + 1 : y;
    const monthEndIso = `${nextYear}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00`;

    // Bills: monthly bills from the new bills table that existed by end of this month
    const bills = allBills
      .filter(
        (b) =>
          b.billing_period === "monthly" &&
          (b.created_at ?? "") < monthEndIso
      )
      .reduce((s, b) => s + Number(b.amount), 0);

    // Expenses: daily entries (no due_date, not savings) created in this month
    const expenses = allEntries
      .filter(
        (e) =>
          !e.due_date &&
          e.category_id !== "savings" &&
          (e.created_at ?? "").startsWith(month)
      )
      .reduce((s, e) => s + Number(e.amount), 0);

    // Savings: expense_entries with category savings created this month
    //        + bills with category savings paid this month (via bill_payments)
    const paidSavingsBillIds = new Set(
      allBillPayments
        .filter((p) => p.paid_month === month)
        .map((p) => p.bill_id)
    );
    const savings =
      allEntries
        .filter(
          (e) =>
            e.category_id === "savings" &&
            (e.created_at ?? "").startsWith(month)
        )
        .reduce((s, e) => s + Number(e.amount), 0) +
      allBills
        .filter((b) => b.category_id === "savings" && paidSavingsBillIds.has(b.id))
        .reduce((s, b) => s + Number(b.amount), 0);

    return { month, bills, expenses, savings };
  });

  return { stats };
}
