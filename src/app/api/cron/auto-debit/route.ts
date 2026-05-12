import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getDueDayOfMonthFromYmd, getCandidateDueDatesForBill } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";

function todayLocalYmd(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** True when `candidate` falls on the same calendar date as `today`. */
function isSameDay(candidate: Date, today: Date): boolean {
  return (
    candidate.getFullYear() === today.getFullYear() &&
    candidate.getMonth() === today.getMonth() &&
    candidate.getDate() === today.getDate()
  );
}

/** Compute the effective due date for a bill in the current month. */
function effectiveDueDate(
  bill: { due_date: string; billing_period: string; due_month: number | null },
  now: Date,
): Date | null {
  const day = getDueDayOfMonthFromYmd(bill.due_date);
  if (!day) return null;

  if (bill.billing_period === "yearly") {
    const month0 = Math.max(0, Math.min(11, (bill.due_month ?? 1) - 1));
    const last = lastDayOfMonth(now.getFullYear(), month0 + 1);
    return new Date(now.getFullYear(), month0, Math.min(day, last));
  }

  // For monthly/quarterly find the candidate date that matches today's month
  const candidates = getCandidateDueDatesForBill(bill, now);
  return candidates.find((c) => c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()) ?? null;
}

export async function GET(request: Request) {
  const bearer = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || bearer !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayYmd = todayLocalYmd(now);
  const paidMonth = getCurrentPaidMonth(now);

  const supabase = createServiceRoleClient();

  const { data: bills, error: billsErr } = await supabase
    .from("bills")
    .select("id, profile_id, category_id, amount, note, account_id, due_date, billing_period, due_month")
    .eq("is_auto_debit", true);

  if (billsErr) {
    return NextResponse.json({ error: billsErr.message }, { status: 500 });
  }

  let marked = 0;
  let skippedAlreadyPaid = 0;
  let skippedNotDueToday = 0;
  let skippedInsufficientBalance = 0;
  const errors: string[] = [];

  for (const bill of bills ?? []) {
    const due = effectiveDueDate(
      {
        due_date: String(bill.due_date),
        billing_period: String(bill.billing_period ?? "monthly"),
        due_month: bill.due_month != null ? Number(bill.due_month) : null,
      },
      now,
    );

    // Skip if not due today
    if (!due || !isSameDay(due, now)) {
      skippedNotDueToday++;
      continue;
    }

    // Skip if already paid for this month
    const { data: existing } = await supabase
      .from("bill_payments")
      .select("id")
      .eq("bill_id", bill.id)
      .eq("profile_id", bill.profile_id)
      .eq("paid_month", paidMonth)
      .maybeSingle();

    if (existing) {
      skippedAlreadyPaid++;
      continue;
    }

    const billAmount = Number(bill.amount);
    const accountId = (bill.account_id as string | null) ?? null;

    // Balance check when account is linked
    if (accountId) {
      const [{ data: account }, { data: txRows }] = await Promise.all([
        supabase
          .from("accounts")
          .select("starting_balance")
          .eq("id", accountId)
          .eq("profile_id", bill.profile_id)
          .maybeSingle(),
        supabase
          .from("account_transactions")
          .select("amount")
          .eq("account_id", accountId)
          .eq("profile_id", bill.profile_id),
      ]);

      if (!account) {
        errors.push(`Bill ${bill.id}: account not found`);
        continue;
      }

      const balance =
        Number(account.starting_balance ?? 0) +
        (txRows ?? []).reduce((s: number, r: { amount: unknown }) => s + Number(r.amount), 0);

      if (balance < billAmount) {
        skippedInsufficientBalance++;
        continue;
      }
    }

    // Insert bill_payment
    const { data: payment, error: payErr } = await supabase
      .from("bill_payments")
      .insert({ bill_id: bill.id, profile_id: bill.profile_id, paid_month: paidMonth })
      .select("id")
      .single();

    if (payErr || !payment) {
      errors.push(`Bill ${bill.id}: ${payErr?.message ?? "insert failed"}`);
      continue;
    }

    // Deduct from account + create expense entry when account is linked
    if (accountId) {
      const description = (bill.note as string | null)?.trim() || "Planned expense (auto debit)";
      const occurredAt = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [{ error: txErr }, { error: expErr }] = await Promise.all([
        supabase.from("account_transactions").insert({
          profile_id: bill.profile_id,
          account_id: accountId,
          type: "expense",
          amount: -Math.abs(billAmount),
          description,
          occurred_at: occurredAt,
          bill_payment_id: payment.id,
        }),
        supabase.from("expense_entries").insert({
          profile_id: bill.profile_id,
          category_id: bill.category_id as string,
          amount: billAmount,
          note: description,
          account_id: accountId,
          bill_payment_id: payment.id,
        }),
      ]);

      if (txErr || expErr) {
        // Roll back the payment so the bill can be retried next day
        await supabase.from("bill_payments").delete().eq("id", payment.id);
        errors.push(`Bill ${bill.id}: side-effect insert failed — ${txErr?.message ?? expErr?.message}`);
        continue;
      }
    }

    marked++;
  }

  return NextResponse.json({
    ok: true,
    date: todayYmd,
    marked,
    skippedAlreadyPaid,
    skippedNotDueToday,
    skippedInsufficientBalance,
    errors: errors.length ? errors : undefined,
  });
}
