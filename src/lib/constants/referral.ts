/**
 * Referral program constants — a single source of truth for the reward maths,
 * the share-link shape, and the marketing copy used on the landing page, the
 * dashboard referral page, and the referral invite email.
 *
 * Reward rules (kept in sync with `public.grant_referral_rewards()` in
 * `supabase/migrations/092_referral_program.sql`):
 *   • Every {@link REFERRAL_SIGNUPS_PER_REWARD} referred signups grants
 *     {@link REFERRAL_SIGNUP_REWARD_MONTHS} month of Pro — stackable, so 10
 *     signups grants 2 months, 15 grants 3, and so on.
 *   • Every referred friend who upgrades to a paid plan grants a further
 *     {@link REFERRAL_CONVERSION_REWARD_MONTHS} month of Pro — stackable per
 *     conversion, and paid on top of the signup milestones.
 */

/** Referred signups needed for one signup-milestone reward. */
export const REFERRAL_SIGNUPS_PER_REWARD = 5;

/** Months of Pro granted each time the signup milestone is reached. */
export const REFERRAL_SIGNUP_REWARD_MONTHS = 1;

/** Months of Pro granted each time a referred friend upgrades to a paid plan. */
export const REFERRAL_CONVERSION_REWARD_MONTHS = 1;

/** Query-string parameter carrying a referral code, e.g. `/?ref=AB12CD`. */
export const REFERRAL_QUERY_PARAM = "ref";

/** Cookie that holds a pending referral code between link click and signup. */
export const REFERRAL_COOKIE_NAME = "omnitrak_ref";

/** How long a clicked referral link stays attributable, in days. */
export const REFERRAL_COOKIE_MAX_AGE_DAYS = 90;

/** Cookie max-age in seconds, for `cookies().set()`. */
export const REFERRAL_COOKIE_MAX_AGE_SECONDS =
  REFERRAL_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

/**
 * Attribution only applies to genuinely new accounts. An account older than
 * this when it first reaches the server is treated as an existing user
 * following a referral link, and is not attributed.
 *
 * Measured from `auth.users.created_at`, which is stamped at signup — not at
 * email confirmation. The window therefore has to be wide enough to cover a
 * friend who signs up, ignores the confirmation email for a day or two, then
 * requests a fresh link: at 24 hours those real referrals were silently lost.
 * Keep in sync with `c_attribution_window` in `public.attribute_referral()`.
 */
export const REFERRAL_ATTRIBUTION_WINDOW_DAYS = 7;

/** Referral codes are fixed-length, uppercase, and unambiguous. */
export const REFERRAL_CODE_LENGTH = 8;

/** Crockford-style alphabet — no 0/O/1/I/L to keep codes easy to read aloud. */
export const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Max invite emails accepted in one send, to keep the action cheap and safe. */
export const REFERRAL_MAX_INVITE_EMAILS = 10;

/**
 * Max invites one account may send per rolling 24 hours. Without a cumulative
 * cap the invite action is an open relay for mail signed by our own domain, so
 * this is enforced in the database (`public.claim_referral_invite_quota`) rather
 * than in memory, which would reset on every serverless cold start.
 */
export const REFERRAL_MAX_INVITES_PER_DAY = 25;

/** Upper bound on the inviter name interpolated into invite emails. */
export const REFERRAL_INVITER_NAME_MAX = 60;

/**
 * Strips control characters and clamps length before an inviter-chosen display
 * name reaches an email subject line. `full_name` is user-writable, so without
 * this an attacker can set it to a phishing lure and have it delivered from our
 * own verified sending domain.
 */
export function sanitizeInviterName(raw: string | null | undefined): string {
  const cleaned = (raw ?? "")
    // Control characters, including the CR/LF that could split a mail header.
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "A friend";
  return cleaned.length > REFERRAL_INVITER_NAME_MAX
    ? `${cleaned.slice(0, REFERRAL_INVITER_NAME_MAX - 1)}…`
    : cleaned;
}

/** Referral statuses as stored in `public.referrals.status`. */
export const REFERRAL_STATUSES = ["signed_up", "converted"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/** Reward kinds as stored in `public.referral_rewards.kind`. */
export const REFERRAL_REWARD_KINDS = ["signup_milestone", "conversion"] as const;
export type ReferralRewardKind = (typeof REFERRAL_REWARD_KINDS)[number];

/** Human labels for reward kinds, for the rewards ledger and admin table. */
export const REFERRAL_REWARD_KIND_LABELS: Record<ReferralRewardKind, string> = {
  signup_milestone: `${REFERRAL_SIGNUPS_PER_REWARD} friends joined`,
  conversion: "Friend upgraded to Pro",
};

// ── Marketing copy ──────────────────────────────────────────────────────────

/** Short headline used on the landing section and the dashboard page. */
export const REFERRAL_HEADLINE = "Invite friends, earn free Pro";

/** One-line pitch. Keep it consistent everywhere the program is mentioned. */
export const REFERRAL_TAGLINE = `Every ${REFERRAL_SIGNUPS_PER_REWARD} friends who join earns you ${REFERRAL_SIGNUP_REWARD_MONTHS} free month of Pro — and every friend who upgrades earns you another.`;

/** The two rules, as user-facing strings. Rendered as a list in several places. */
export const REFERRAL_RULES = [
  {
    metric: `${REFERRAL_SIGNUPS_PER_REWARD} friends join`,
    reward: `${REFERRAL_SIGNUP_REWARD_MONTHS} month of Pro`,
    detail: `Stackable — every ${REFERRAL_SIGNUPS_PER_REWARD} signups adds another free month.`,
  },
  {
    metric: "1 friend upgrades to Pro",
    reward: `${REFERRAL_CONVERSION_REWARD_MONTHS} month of Pro`,
    detail: "Stackable — paid on top of your signup milestones, per upgrade.",
  },
] as const;

/** Default message used by the native share sheet and the copy-message button. */
export function buildReferralShareMessage(link: string): string {
  return `I track my bills and spending with OmniTrak — it's genuinely made me better with money. Sign up with my link and we both get free Pro: ${link}`;
}

/** Canonical share link for a code. Pass the site origin from `getBaseUrl()`. */
export function buildReferralLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}/r/${code}`;
}

/** Referrals still needed to reach the next signup milestone. */
export function referralsUntilNextReward(signupCount: number): number {
  const remainder = signupCount % REFERRAL_SIGNUPS_PER_REWARD;
  return REFERRAL_SIGNUPS_PER_REWARD - remainder;
}

/** Progress toward the next signup milestone, as a 0–100 percentage. */
export function referralMilestoneProgress(signupCount: number): number {
  const remainder = signupCount % REFERRAL_SIGNUPS_PER_REWARD;
  return Math.round((remainder / REFERRAL_SIGNUPS_PER_REWARD) * 100);
}
