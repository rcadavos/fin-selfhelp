import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProfileIdsWithFeatureOff } from "@/lib/app-mode-server";
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

  // Resolve each bill owners app mode up front, in one scan. Fail CLOSED: continuing
  // with an empty set would debit accounts for users who switched auto-debit off.
  const { ids: autoDebitOffProfileIds, error: modeErr } = await fetchProfileIdsWithFeatureOff(
    supabase,
    "autoDebit",
  );
  if (modeErr) {
    return NextResponse.json({ error: `App mode lookup failed — ${modeErr}` }, { status: 500 });
  }

  let marked = 0;
  let markedFailed = 0;
  let skippedAlreadyPaid = 0;
  let skippedNotDueToday = 0;
  let skippedModeDisabled = 0;
  const errors: string[] = [];

  /**
   * Record a failure for this bill+month. Uses the (bill_id, paid_month) unique
   * index so retries replace the previous failed row. When the retry later
   * succeeds, the same row is overwritten with status='paid'.
   */
  async function recordFailure(
    bill: { id: string; profile_id: string },
    reason: string,
  ) {
    const { error } = await supabase
      .from("bill_payments")
      .upsert(
        {
          bill_id: bill.id,
          profile_id: bill.profile_id,
          paid_month: paidMonth,
          amount_paid: 0,
          status: "failed",
          failure_reason: reason,
        },
        { onConflict: "bill_id,paid_month" },
      );
    if (error) {
      errors.push(`Bill ${bill.id}: failed to record failure — ${error.message}`);
      return;
    }
    markedFailed++;
  }

  for (const bill of bills ?? []) {
    // Auto-debit does not exist in an app mode that switches it off — skip silently.
    // Never recordFailure() here: a status="failed" row would claim an attempt was
    // made and will retry, occupy the (bill_id, paid_month) upsert slot, and paint a
    // red badge for something that was never tried.
    if (autoDebitOffProfileIds.has(String(bill.profile_id))) {
      skippedModeDisabled++;
      continue;
    }

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

    // Skip if already paid for this month. A 'failed' row from an earlier
    // attempt does NOT block the retry — it will be overwritten on success
    // or replaced with a fresh failure reason via the same upsert key.
    const { data: existing } = await supabase
      .from("bill_payments")
      .select("id, status")
      .eq("bill_id", bill.id)
      .eq("profile_id", bill.profile_id)
      .eq("paid_month", paidMonth)
      .maybeSingle();

    if (existing && existing.status === "paid") {
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
          .select("starting_balance, account_alias")
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
        await recordFailure(bill, "Linked account not found");
        continue;
      }

      const balance =
        Number(account.starting_balance ?? 0) +
        (txRows ?? []).reduce((s: number, r: { amount: unknown }) => s + Number(r.amount), 0);

      if (balance < billAmount) {
        const alias = (account.account_alias as string | null) ?? "Linked account";
        await recordFailure(
          bill,
          `Insufficient balance — ${alias} has ${balance.toFixed(2)}, needs ${billAmount.toFixed(2)}`,
        );
        continue;
      }
    }

    // Upsert bill_payment — auto-debit always records a full payment.
    // Upsert (not insert) so a prior failed row for this month is replaced.
    const { data: payment, error: payErr } = await supabase
      .from("bill_payments")
      .upsert(
        {
          bill_id: bill.id,
          profile_id: bill.profile_id,
          paid_month: paidMonth,
          amount_paid: billAmount,
          status: "paid",
          failure_reason: null,
        },
        { onConflict: "bill_id,paid_month" },
      )
      .select("id")
      .single();

    if (payErr || !payment) {
      await recordFailure(bill, payErr?.message ?? "Payment insert failed");
      continue;
    }

    // Deduct from account when one is linked
    if (accountId) {
      const description = (bill.note as string | null)?.trim() || "Planned expense (auto debit)";
      const occurredAt = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { error: txErr } = await supabase.from("account_transactions").insert({
        profile_id: bill.profile_id,
        account_id: accountId,
        type: "auto_pay",
        amount: -Math.abs(billAmount),
        description,
        occurred_at: occurredAt,
        bill_payment_id: payment.id,
      });

      if (txErr) {
        // Side-effect failed — mark the bill as failed so the UI reflects it
        // and tomorrow's run can retry. Overwriting with status='failed'
        // via upsert is fine because the FK on account_transactions.bill_payment_id
        // is ON DELETE cascade and we never created one here.
        await recordFailure(bill, `Account transaction failed — ${txErr.message}`);
        continue;
      }
    }

    marked++;
  }

  return NextResponse.json({
    ok: true,
    date: todayYmd,
    marked,
    markedFailed,
    skippedAlreadyPaid,
    skippedNotDueToday,
    skippedModeDisabled,
    errors: errors.length ? errors : undefined,
  });
}
