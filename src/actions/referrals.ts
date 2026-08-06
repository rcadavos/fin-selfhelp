"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/seo";
import { sendReferralInviteEmail } from "@/lib/email";
import { normalizeReferralCode } from "@/lib/referral-cookie";
import {
  REFERRAL_COOKIE_NAME,
  REFERRAL_MAX_INVITE_EMAILS,
  REFERRAL_MAX_INVITES_PER_DAY,
  buildReferralLink,
  sanitizeInviterName,
  type ReferralRewardKind,
  type ReferralStatus,
} from "@/lib/constants/referral";

export type ReferralRewardRow = {
  id: string;
  kind: ReferralRewardKind;
  months: number;
  milestoneIndex: number | null;
  grantedAt: string;
};

export type ReferredFriendRow = {
  id: string;
  status: ReferralStatus;
  displayName: string;
  maskedEmail: string | null;
  signedUpAt: string;
  convertedAt: string | null;
};

export type ReferralSummary = {
  code: string;
  link: string;
  signupCount: number;
  convertedCount: number;
  monthsEarned: number;
  rewards: ReferralRewardRow[];
  referred: ReferredFriendRow[];
};

/** Shape returned by the `get_my_referral_summary` RPC. */
type SummaryRpc = {
  ok: boolean;
  error?: string;
  code: string | null;
  signup_count: number | string;
  converted_count: number | string;
  months_earned: number | string;
  rewards: {
    id: string;
    kind: ReferralRewardKind;
    months: number | string;
    milestone_index: number | null;
    granted_at: string;
  }[];
  referred: {
    id: string;
    status: ReferralStatus;
    display_name: string;
    masked_email: string | null;
    signed_up_at: string;
    converted_at: string | null;
  }[];
};

// ─── Referral code + summary ──────────────────────────────────────────────────

/** Mints the caller's referral code on first use, then returns it. */
export async function ensureMyReferralCode(): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_referral_code");
  if (error) return { error: error.message };
  if (typeof data !== "string" || !data) return { error: "Could not create your referral code." };
  return { code: data };
}

/**
 * Everything the referral dashboard renders: the share link, both counts, the
 * months already earned, the rewards ledger, and the referred-friends list.
 */
export async function getMyReferralSummary(): Promise<ReferralSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_my_referral_summary");
  if (error || !data) return null;

  const rpc = data as SummaryRpc;
  if (!rpc.ok) return null;

  // Accounts created before the referral program shipped may not have a code yet.
  let code = rpc.code;
  if (!code) {
    const ensured = await ensureMyReferralCode();
    if (!ensured.code) return null;
    code = ensured.code;
  }

  return {
    code,
    link: buildReferralLink(getBaseUrl(), code),
    signupCount: Number(rpc.signup_count ?? 0),
    convertedCount: Number(rpc.converted_count ?? 0),
    monthsEarned: Number(rpc.months_earned ?? 0),
    rewards: (rpc.rewards ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      months: Number(r.months ?? 1),
      milestoneIndex: r.milestone_index,
      grantedAt: r.granted_at,
    })),
    referred: (rpc.referred ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      displayName: r.display_name,
      maskedEmail: r.masked_email,
      signedUpAt: r.signed_up_at,
      convertedAt: r.converted_at,
    })),
  };
}

// ─── Attribution ──────────────────────────────────────────────────────────────

/**
 * Verdicts from `attribute_referral` that will never succeed on a retry. Any
 * other outcome (a transport error, a database blip) leaves the pending code in
 * place so the next request can try again.
 */
const TERMINAL_ATTRIBUTION_ERRORS = new Set([
  "already_referred",
  "self_referral",
  "code_not_found",
  "invalid_code",
  "attribution_window_passed",
]);

/**
 * Claims a pending referral for the signed-in user, then clears the code from
 * wherever it was carried.
 *
 * A code can arrive two ways, and both are checked:
 *   1. the `omnitrak_ref` cookie, set by `/r/<code>` or a `?ref=` link;
 *   2. `user_metadata.referral_code_pending`, seeded at signup — the only
 *      carrier that survives confirming the email on a different device, where
 *      the cookie is on the browser that clicked the link, not the one that
 *      opened the confirmation.
 *
 * Safe to call on every request: the RPC rejects self-referrals, accounts that
 * are already attributed, and accounts older than the attribution window, so a
 * returning user still holding a stale code is never counted.
 *
 * Must run somewhere that can write cookies — a route handler or server action.
 */
export async function claimPendingReferral(): Promise<{ claimed: boolean; error?: string }> {
  const cookieStore = await cookies();
  const cookieCode = normalizeReferralCode(cookieStore.get(REFERRAL_COOKIE_NAME)?.value);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { claimed: false };

  const metadataCode = normalizeReferralCode(
    user.user_metadata?.referral_code_pending as string | undefined
  );
  const code = cookieCode ?? metadataCode;

  const clearCarriers = () => {
    if (cookieCode) {
      try {
        cookieStore.delete(REFERRAL_COOKIE_NAME);
      } catch {
        // Called from a context that cannot write cookies; harmless.
      }
    }
    if (metadataCode) {
      supabase.auth.updateUser({ data: { referral_code_pending: null } }).catch(() => {});
    }
  };

  if (!code) return { claimed: false };

  const { data, error } = await supabase.rpc("attribute_referral", { p_code: code });

  // A transport or database failure is retryable, so keep the carriers and let
  // the next authenticated request try again. Clearing them here would silently
  // lose a genuine referral: nothing can re-seed a code for an existing account.
  if (error) return { claimed: false, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result) return { claimed: false, error: "no_response" };

  if (result.ok) {
    clearCarriers();
    return { claimed: true };
  }

  // Only these verdicts are final; anything else stays retryable.
  if (TERMINAL_ATTRIBUTION_ERRORS.has(result.error ?? "")) {
    clearCarriers();
  }
  return { claimed: false, error: result.error };
}

/** Reads the pending referral code so `signUp` can seed it into user metadata. */
export async function readPendingReferralCode(): Promise<string | null> {
  const cookieStore = await cookies();
  return normalizeReferralCode(cookieStore.get(REFERRAL_COOKIE_NAME)?.value);
}

/**
 * Server-only conversion hook, called after a successful paid upgrade.
 *
 * The `subscription_payments_referral_conversion` trigger already fires whenever
 * a payment is recorded, so this is a belt-and-braces call for code paths that
 * want the payout to have definitely happened before they return. Idempotent,
 * and reachable only with the service role.
 */
export async function markReferralConvertedForUserId(
  userId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.rpc("mark_referral_converted", {
      p_referred_user_id: userId,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record referral conversion." };
  }
}

// ─── Email invites ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Emails the caller's referral link to a short list of friends. */
export async function sendReferralInvites(
  rawEmails: string[]
): Promise<{ sent?: number; skipped?: string[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const seen = new Set<string>();
  const valid: string[] = [];
  const skipped: string[] = [];

  for (const raw of rawEmails) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (email === user.email?.toLowerCase()) {
      skipped.push(email);
      continue;
    }
    if (!EMAIL_RE.test(email) || seen.has(email)) {
      skipped.push(email);
      continue;
    }
    seen.add(email);
    valid.push(email);
  }

  if (valid.length === 0) return { error: "Add at least one valid email address." };
  if (valid.length > REFERRAL_MAX_INVITE_EMAILS) {
    return { error: `You can invite up to ${REFERRAL_MAX_INVITE_EMAILS} friends at a time.` };
  }

  const ensured = await ensureMyReferralCode();
  if (!ensured.code) return { error: ensured.error ?? "Could not load your referral link." };

  // Claim the daily quota before sending anything. The RPC logs the addresses it
  // hands back, so a caller looping this action cannot exceed the cap even across
  // concurrent requests or serverless instances.
  const { data: quotaData, error: quotaError } = await supabase.rpc(
    "claim_referral_invite_quota",
    { p_emails: valid }
  );
  if (quotaError) return { error: "Could not send the invites. Please try again." };

  const quota = quotaData as { ok?: boolean; error?: string; accepted?: string[] } | null;
  if (!quota?.ok) {
    if (quota?.error === "quota_exceeded") {
      return {
        error: `You have reached the limit of ${REFERRAL_MAX_INVITES_PER_DAY} invites per day. Please try again tomorrow.`,
      };
    }
    return { error: "Could not send the invites. Please try again." };
  }

  const accepted = quota.accepted ?? [];
  if (accepted.length === 0) {
    return {
      error: `You have reached the limit of ${REFERRAL_MAX_INVITES_PER_DAY} invites per day. Please try again tomorrow.`,
    };
  }
  // Anything the quota withheld is reported back as skipped, not silently dropped.
  const overQuota = valid.filter((e) => !accepted.includes(e));

  const link = buildReferralLink(getBaseUrl(), ensured.code);
  const inviterName = sanitizeInviterName(
    (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0]
  );

  // sendReferralInviteEmail resolves with { ok: false } rather than rejecting,
  // so a transport failure shows up as a skipped address, not a thrown error.
  const results = await Promise.all(
    accepted.map((to) =>
      sendReferralInviteEmail({ to, inviterName, link }).catch(() => ({ ok: false as const }))
    )
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = accepted.filter((_, i) => !results[i].ok);

  if (sent === 0) return { error: "Could not send the invites. Please try again." };
  return { sent, skipped: [...skipped, ...overQuota, ...failed] };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminReferralRow = {
  userId: string;
  email: string;
  fullName: string | null;
  referralCode: string | null;
  signupCount: number;
  convertedCount: number;
  monthsGranted: number;
  lastReferralAt: string | null;
};

export type AdminReferralStats = {
  rows: AdminReferralRow[];
  totals: {
    referrers: number;
    signups: number;
    conversions: number;
    monthsGranted: number;
  };
};

/** Admin: per-referrer counts plus programme totals. Guarded inside the RPC. */
export async function getReferralStatsForAdmin(): Promise<{
  stats: AdminReferralStats;
  error?: string;
}> {
  const empty: AdminReferralStats = {
    rows: [],
    totals: { referrers: 0, signups: 0, conversions: 0, monthsGranted: 0 },
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_referral_stats_for_admin");
    if (error) return { stats: empty, error: error.message };

    const rows: AdminReferralRow[] = (
      (data ?? []) as {
        user_id: string;
        email: string;
        full_name: string | null;
        referral_code: string | null;
        signup_count: number | string;
        converted_count: number | string;
        months_granted: number | string;
        last_referral_at: string | null;
      }[]
    ).map((r) => ({
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      referralCode: r.referral_code,
      signupCount: Number(r.signup_count ?? 0),
      convertedCount: Number(r.converted_count ?? 0),
      monthsGranted: Number(r.months_granted ?? 0),
      lastReferralAt: r.last_referral_at,
    }));

    return {
      stats: {
        rows,
        totals: {
          referrers: rows.length,
          signups: rows.reduce((n, r) => n + r.signupCount, 0),
          conversions: rows.reduce((n, r) => n + r.convertedCount, 0),
          monthsGranted: rows.reduce((n, r) => n + r.monthsGranted, 0),
        },
      },
    };
  } catch (e) {
    return { stats: empty, error: e instanceof Error ? e.message : "Failed to load referral stats." };
  }
}

/** Called after a referral changes so the dashboard and admin views refresh. */
export async function revalidateReferralPages() {
  revalidatePath("/dashboard/referrals");
  revalidatePath("/admin/referrals");
}
