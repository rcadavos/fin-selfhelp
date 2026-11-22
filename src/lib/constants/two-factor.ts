import type { TwoFactorPurpose } from "@/lib/shared/two-factor";

/**
 * Two-step verification by email — after a correct email + password, OmniTrak emails
 * a 6-digit code that must be entered before a session is handed over. Codes live in
 * `public.two_factor_challenges` (service role only).
 *
 * Values the mobile app also needs are defined in `src/lib/shared/two-factor.ts` and
 * re-exported here, so web code keeps importing every constant from this file.
 */

export {
  TWO_FACTOR_APP_METADATA_KEY,
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_MINUTES,
  TWO_FACTOR_PURPOSES,
} from "@/lib/shared/two-factor";
export type { TwoFactorPurpose, TwoFactorSettingsPurpose } from "@/lib/shared/two-factor";

/** Wrong guesses allowed per code before a new one has to be requested. */
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

/** Minimum gap between two emailed codes for the same purpose. */
export const TWO_FACTOR_RESEND_COOLDOWN_SECONDS = 60;

/** Codes that can be emailed per purpose within one window. */
export const TWO_FACTOR_MAX_SENDS = 5;

/** Length of the window `TWO_FACTOR_MAX_SENDS` counts over. */
export const TWO_FACTOR_SEND_WINDOW_MINUTES = 60;

/** httpOnly cookie that ties a pending sign-in to the browser that entered the password. */
export const TWO_FACTOR_CHALLENGE_COOKIE = "omnitrak_2fa_challenge";

/** Lifetime of that cookie; long enough to cover a few resends. */
export const TWO_FACTOR_CHALLENGE_COOKIE_MAX_AGE_SECONDS = 30 * 60;

/**
 * Storage key for the in-memory client the login page checks passwords with. It must
 * differ from the app client's key so the two never share a storage slot or auth lock.
 */
export const PASSWORD_CHECK_AUTH_STORAGE_KEY = "omnitrak-password-check";

/** The line in the code email that says what the code is for. */
export const TWO_FACTOR_EMAIL_PURPOSE_COPY: Record<TwoFactorPurpose, { heading: string; body: string }> = {
  sign_in: {
    heading: "Your sign-in code",
    body: "Someone just signed in to OmniTrak with your email and password. Enter this code to finish signing in.",
  },
  enable: {
    heading: "Turn on two-step verification",
    body: "Enter this code on the Security page to turn on two-step verification for your OmniTrak account.",
  },
  disable: {
    heading: "Turn off two-step verification",
    body: "Enter this code on the Security page to turn off two-step verification for your OmniTrak account.",
  },
};
