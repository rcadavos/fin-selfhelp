import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTwoFactorCodeEmail } from "@/lib/email";
import {
  isEmailTwoFactorEnabled,
  maskEmail,
  normalizeTwoFactorCode,
  type TwoFactorCodeSent,
  type TwoFactorFailure,
  type TwoFactorSignInChallenge,
} from "@/lib/shared/two-factor";
import {
  TWO_FACTOR_APP_METADATA_KEY,
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_MINUTES,
  TWO_FACTOR_MAX_ATTEMPTS,
  TWO_FACTOR_MAX_SENDS,
  TWO_FACTOR_RESEND_COOLDOWN_SECONDS,
  TWO_FACTOR_SEND_WINDOW_MINUTES,
  type TwoFactorPurpose,
  type TwoFactorSettingsPurpose,
} from "@/lib/constants/two-factor";

/*
 * Two-step verification by email — server only (service-role key).
 *
 * Sign in: the caller checks the password on a client that keeps the session in
 * memory, so it is never stored. For a two-step account it hands the access token to
 * startSignInChallenge, which revokes that session and emails a code. Once the code
 * checks out, verifySignInChallenge returns a one-time magic-link token that the
 * client redeems for a fresh session.
 *
 * Settings: turning the feature on or off needs a code too, so a stolen session can't
 * quietly switch it off.
 *
 * Callers: the web's server actions (`src/actions/two-factor.ts`, challenge id in an
 * httpOnly cookie) and the mobile app's API routes (`src/app/api/auth/two-factor/`,
 * challenge id in the request body).
 */

const TABLE = "two_factor_challenges";
const CODE_TTL_MS = TWO_FACTOR_CODE_TTL_MINUTES * 60 * 1000;
const SEND_WINDOW_MS = TWO_FACTOR_SEND_WINDOW_MINUTES * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIGN_IN_EXPIRED = "This sign-in has expired. Please sign in again.";
const SEND_FAILED = "We couldn't send your code. Please try again.";
const SOMETHING_WRONG = "Something went wrong. Please try again.";

type Admin = ReturnType<typeof createServiceRoleClient>;

type ChallengeRow = {
  id: string;
  user_id: string;
  purpose: TwoFactorPurpose;
  code_hash: string;
  attempts: number;
  sends: number;
  sends_window_started_at: string;
  last_sent_at: string;
  expires_at: string;
};

type CodeRecipient = { userId: string; email: string; name?: string };

function recipientFor(user: User): CodeRecipient | null {
  if (!user.email) return null;
  const name = user.user_metadata?.full_name;
  return { userId: user.id, email: user.email, name: typeof name === "string" ? name : undefined };
}

function generateCode(): string {
  return randomInt(0, 10 ** TWO_FACTOR_CODE_LENGTH).toString().padStart(TWO_FACTOR_CODE_LENGTH, "0");
}

function hashCode(userId: string, purpose: TwoFactorPurpose, code: string): string {
  return createHash("sha256").update(`${userId}:${purpose}:${code}`).digest("hex");
}

function secondsUntilResend(row: ChallengeRow, now: number): number {
  const elapsed = now - new Date(row.last_sent_at).getTime();
  return Math.max(0, Math.ceil((TWO_FACTOR_RESEND_COOLDOWN_SECONDS * 1000 - elapsed) / 1000));
}

function isCodeUsable(row: ChallengeRow, now: number): boolean {
  return row.attempts < TWO_FACTOR_MAX_ATTEMPTS && new Date(row.expires_at).getTime() > now;
}

function waitMessage(seconds: number): string {
  return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before asking for another code.`;
}

function isSettingsPurpose(value: unknown): value is TwoFactorSettingsPurpose {
  return value === "enable" || value === "disable";
}

/** Challenge ids come from a cookie or a request body; reject anything that isn't a uuid. */
function isChallengeId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

async function loadChallenge(
  admin: Admin,
  match: { id: string } | { user_id: string },
  purpose: TwoFactorPurpose
): Promise<ChallengeRow | null> {
  const { data } = await admin
    .from(TABLE)
    .select("*")
    .match({ ...match, purpose })
    .maybeSingle<ChallengeRow>();
  return data ?? null;
}

type IssueResult = { ok: true; challengeId: string; resendInSeconds: number } | { ok: false; error: string };

/**
 * Emails a fresh code for (user, purpose), or reuses the one already out when it was
 * sent inside the resend cooldown and can still be used — going back and re-entering
 * a password shouldn't burn a code or spam the inbox.
 */
async function issueCode(admin: Admin, to: CodeRecipient, purpose: TwoFactorPurpose): Promise<IssueResult> {
  const { data: existing, error: readError } = await admin
    .from(TABLE)
    .select("*")
    .match({ user_id: to.userId, purpose })
    .maybeSingle<ChallengeRow>();
  if (readError) return { ok: false, error: SEND_FAILED };

  const now = Date.now();
  if (existing) {
    const wait = secondsUntilResend(existing, now);
    if (wait > 0) {
      if (isCodeUsable(existing, now)) return { ok: true, challengeId: existing.id, resendInSeconds: wait };
      return { ok: false, error: waitMessage(wait) };
    }
  }

  const windowOpen =
    existing !== null && now - new Date(existing.sends_window_started_at).getTime() < SEND_WINDOW_MS;
  const sendsSoFar = windowOpen ? existing.sends : 0;
  if (sendsSoFar >= TWO_FACTOR_MAX_SENDS) {
    return { ok: false, error: "You've asked for too many codes. Please try again in an hour." };
  }

  const code = generateCode();
  const nowIso = new Date(now).toISOString();
  const fields = {
    code_hash: hashCode(to.userId, purpose, code),
    attempts: 0,
    sends: sendsSoFar + 1,
    last_sent_at: nowIso,
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
    ...(windowOpen ? {} : { sends_window_started_at: nowIso }),
  };

  let challengeId: string;
  if (existing) {
    const { error } = await admin.from(TABLE).update(fields).eq("id", existing.id);
    if (error) return { ok: false, error: SEND_FAILED };
    challengeId = existing.id;
  } else {
    const { data, error } = await admin
      .from(TABLE)
      .insert({ user_id: to.userId, purpose, ...fields, sends_window_started_at: nowIso })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: SEND_FAILED };
    challengeId = data.id;
  }

  const sent = await sendTwoFactorCodeEmail({ to: to.email, name: to.name, code, purpose });
  if (!sent.ok) {
    console.error("[two-factor]", sent.error);
    // A code that never arrived must not be guessable, nor hold up a retry.
    await admin
      .from(TABLE)
      .update({ expires_at: nowIso, last_sent_at: new Date(0).toISOString() })
      .eq("id", challengeId);
    return { ok: false, error: SEND_FAILED };
  }

  return { ok: true, challengeId, resendInSeconds: TWO_FACTOR_RESEND_COOLDOWN_SECONDS };
}

/**
 * Checks `rawCode` against the row. Each guess first claims an attempt with a
 * compare-and-set on `attempts`, so firing guesses in parallel can't share one
 * attempt. A correct code deletes the row, which also makes it single-use.
 */
async function checkCode(
  admin: Admin,
  row: ChallengeRow,
  rawCode: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeTwoFactorCode(String(rawCode ?? ""));
  if (code.length !== TWO_FACTOR_CODE_LENGTH) {
    return { ok: false, error: `Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from the email.` };
  }

  const now = Date.now();
  if (row.attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong codes. Ask for a new one." };
  }
  if (new Date(row.expires_at).getTime() <= now) {
    return { ok: false, error: "That code has expired. Ask for a new one." };
  }

  const attempts = row.attempts + 1;
  const { data: claimed, error: claimError } = await admin
    .from(TABLE)
    .update({ attempts })
    .match({ id: row.id, attempts: row.attempts })
    .select("id");
  if (claimError || !claimed?.length) return { ok: false, error: SOMETHING_WRONG };

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashCode(row.user_id, row.purpose, code), "hex");
  if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
    const { data: deleted, error: deleteError } = await admin.from(TABLE).delete().eq("id", row.id).select("id");
    if (deleteError || !deleted?.length) return { ok: false, error: SOMETHING_WRONG };
    return { ok: true };
  }

  const left = TWO_FACTOR_MAX_ATTEMPTS - attempts;
  return {
    ok: false,
    error:
      left > 0
        ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "Too many wrong codes. Ask for a new one.",
  };
}

// ── Sign in ──────────────────────────────────────────────────────────────────

/**
 * Second step of a password sign-in for a two-step account. `accessToken` is the
 * session the caller just got from the password check; it is revoked here before a
 * code goes out, so it is dead even if the code can't be sent.
 */
export async function startSignInChallenge(
  accessToken: string
): Promise<TwoFactorSignInChallenge | TwoFactorFailure> {
  if (typeof accessToken !== "string" || !accessToken) return { error: SIGN_IN_EXPIRED };

  const admin = createServiceRoleClient();
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const user = userData?.user;
  if (userError || !user) return { error: SIGN_IN_EXPIRED };
  if (!isEmailTwoFactorEnabled(user)) return { error: SOMETHING_WRONG };

  await admin.auth.admin.signOut(accessToken, "local");

  const to = recipientFor(user);
  if (!to) return { error: SOMETHING_WRONG };

  const issued = await issueCode(admin, to, "sign_in");
  if (!issued.ok) return { error: issued.error };
  return {
    challengeId: issued.challengeId,
    maskedEmail: maskEmail(to.email),
    resendInSeconds: issued.resendInSeconds,
  };
}

/**
 * Checks the emailed sign-in code. On success returns a one-time token hash the client
 * redeems with `verifyOtp({ type: "magiclink", token_hash })`; nothing is emailed for
 * it — `generateLink` only mints the token.
 */
export async function verifySignInChallenge(
  challengeId: unknown,
  code: unknown
): Promise<{ tokenHash: string } | TwoFactorFailure> {
  if (!isChallengeId(challengeId)) return { error: SIGN_IN_EXPIRED, restart: true };

  const admin = createServiceRoleClient();
  const row = await loadChallenge(admin, { id: challengeId }, "sign_in");
  if (!row) return { error: SIGN_IN_EXPIRED, restart: true };

  const checked = await checkCode(admin, row, code);
  if (!checked.ok) return { error: checked.error };

  const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
  const email = userData?.user?.email;
  if (!email) return { error: SIGN_IN_EXPIRED, restart: true };

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("[two-factor] generateLink failed", linkError?.message);
    return { error: "We couldn't finish signing you in. Please sign in again.", restart: true };
  }
  return { tokenHash };
}

/** Emails a new code for a pending sign-in. */
export async function resendSignInChallenge(
  challengeId: unknown
): Promise<{ resendInSeconds: number } | TwoFactorFailure> {
  if (!isChallengeId(challengeId)) return { error: SIGN_IN_EXPIRED, restart: true };

  const admin = createServiceRoleClient();
  const row = await loadChallenge(admin, { id: challengeId }, "sign_in");
  const { data: userData } = row ? await admin.auth.admin.getUserById(row.user_id) : { data: null };
  const user = userData?.user;
  const to = user ? recipientFor(user) : null;
  if (!row || !user || !to || !isEmailTwoFactorEnabled(user)) return { error: SIGN_IN_EXPIRED, restart: true };

  const issued = await issueCode(admin, to, "sign_in");
  if (!issued.ok) return { error: issued.error };
  return { resendInSeconds: issued.resendInSeconds };
}

// ── Settings ─────────────────────────────────────────────────────────────────

/**
 * Emails the code that confirms turning two-step verification on or off. `user` must
 * come fresh from the auth server (`getUser`), not from a decoded JWT, so its
 * app_metadata is current.
 */
export async function sendSettingsCode(
  user: User,
  purpose: unknown
): Promise<TwoFactorCodeSent | TwoFactorFailure> {
  if (!isSettingsPurpose(purpose)) return { error: SOMETHING_WRONG };
  const to = recipientFor(user);
  if (!to) return { error: "Your account has no email address to send a code to." };

  const enabled = isEmailTwoFactorEnabled(user);
  if (purpose === "enable" && enabled) return { error: "Two-step verification is already on.", restart: true };
  if (purpose === "disable" && !enabled) return { error: "Two-step verification is already off.", restart: true };

  const issued = await issueCode(createServiceRoleClient(), to, purpose);
  if (!issued.ok) return { error: issued.error };
  return { maskedEmail: maskEmail(to.email), resendInSeconds: issued.resendInSeconds };
}

/** Checks the settings code and flips the switch in app_metadata. */
export async function confirmSettingsCode(
  user: User,
  purpose: unknown,
  code: unknown
): Promise<{ enabled: boolean } | TwoFactorFailure> {
  if (!isSettingsPurpose(purpose)) return { error: SOMETHING_WRONG };

  const admin = createServiceRoleClient();
  const row = await loadChallenge(admin, { user_id: user.id }, purpose);
  if (!row) return { error: "That code has expired. Ask for a new one.", restart: true };

  const checked = await checkCode(admin, row, code);
  if (!checked.ok) return { error: checked.error };

  const enabled = purpose === "enable";
  // GoTrue merges app_metadata key by key, so this leaves provider/providers alone.
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { [TWO_FACTOR_APP_METADATA_KEY]: enabled },
  });
  if (error) {
    console.error("[two-factor] updateUserById failed", error.message);
    return { error: "We couldn't save that change. Please try again.", restart: true };
  }
  return { enabled };
}
