/**
 * Two-step verification by email: the pieces the web app and the mobile app both
 * need. Dependency-free with relative imports only (see `number-format.ts`). The
 * server side lives in `src/lib/auth/two-factor-server.ts`.
 */

/** Digits in an emailed code. */
export const TWO_FACTOR_CODE_LENGTH = 6;

/** How long a code stays valid after it is sent. */
export const TWO_FACTOR_CODE_TTL_MINUTES = 10;

/**
 * `auth.users.raw_app_meta_data` key that turns the feature on for a user.
 * app_metadata, not user_metadata: only the service role can write it, so a stolen
 * session cannot quietly switch the second step off.
 */
export const TWO_FACTOR_APP_METADATA_KEY = "two_factor_email";

export const TWO_FACTOR_PURPOSES = ["sign_in", "enable", "disable"] as const;
export type TwoFactorPurpose = (typeof TWO_FACTOR_PURPOSES)[number];

/** Purposes started from the Security page (web) or screen (app). */
export type TwoFactorSettingsPurpose = Extract<TwoFactorPurpose, "enable" | "disable">;

/** A code went out (or a still-valid one was reused); the UI can start its resend timer. */
export type TwoFactorCodeSent = { maskedEmail: string; resendInSeconds: number };

/**
 * A pending password sign-in. The web keeps `challengeId` in an httpOnly cookie; the
 * app, which has no cookies, holds it in memory and sends it back with the code.
 */
export type TwoFactorSignInChallenge = TwoFactorCodeSent & { challengeId: string };

/** `restart` means the flow is dead (expired, signed out) and has to begin again. */
export type TwoFactorFailure = { error: string; restart?: boolean };

/** True when the user has turned on two-step verification by email. */
export function isEmailTwoFactorEnabled(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined
): boolean {
  return user?.app_metadata?.[TWO_FACTOR_APP_METADATA_KEY] === true;
}

/** Digits only, at most a full code, so a pasted "123 456" or "123-456" still fits. */
export function normalizeTwoFactorCode(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, TWO_FACTOR_CODE_LENGTH);
}

/** `juan.delacruz@gmail.com` → `j•••@gmail.com`, for showing where a code went. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  return `${email[0]}•••${email.slice(at)}`;
}
