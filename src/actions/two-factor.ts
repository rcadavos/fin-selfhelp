"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  confirmSettingsCode,
  resendSignInChallenge,
  sendSettingsCode,
  startSignInChallenge,
  verifySignInChallenge,
} from "@/lib/auth/two-factor-server";
import type { TwoFactorCodeSent, TwoFactorFailure, TwoFactorSettingsPurpose } from "@/lib/shared/two-factor";
import {
  TWO_FACTOR_CHALLENGE_COOKIE,
  TWO_FACTOR_CHALLENGE_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/constants/two-factor";

/*
 * The web's entry points for two-step verification. The logic lives in
 * `src/lib/auth/two-factor-server.ts`; these add the httpOnly cookie that ties a
 * pending sign-in to the browser that entered the password. The mobile app uses the
 * API routes under `src/app/api/auth/two-factor/` instead.
 */

const SIGNED_OUT = "Your session has ended. Please log in again.";

async function readChallengeCookie(): Promise<string | null> {
  return (await cookies()).get(TWO_FACTOR_CHALLENGE_COOKIE)?.value ?? null;
}

async function clearChallengeCookie(): Promise<void> {
  (await cookies()).delete(TWO_FACTOR_CHALLENGE_COOKIE);
}

/**
 * Second step of a password login for a two-step account. `accessToken` is the
 * session the login page just got from its in-memory password check.
 */
export async function beginTwoFactorSignIn(accessToken: string): Promise<TwoFactorCodeSent | TwoFactorFailure> {
  const result = await startSignInChallenge(accessToken);
  if ("error" in result) return result;

  (await cookies()).set(TWO_FACTOR_CHALLENGE_COOKIE, result.challengeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TWO_FACTOR_CHALLENGE_COOKIE_MAX_AGE_SECONDS,
  });
  return { maskedEmail: result.maskedEmail, resendInSeconds: result.resendInSeconds };
}

/** Checks the emailed sign-in code; on success returns a token hash for `verifyOtp`. */
export async function verifyTwoFactorSignIn(code: string): Promise<{ tokenHash: string } | TwoFactorFailure> {
  const result = await verifySignInChallenge(await readChallengeCookie(), code);
  if (!("error" in result) || result.restart) await clearChallengeCookie();
  return result;
}

/** Emails a new sign-in code for the pending sign-in in this browser. */
export async function resendTwoFactorSignInCode(): Promise<{ resendInSeconds: number } | TwoFactorFailure> {
  const result = await resendSignInChallenge(await readChallengeCookie());
  if ("error" in result && result.restart) await clearChallengeCookie();
  return result;
}

/** "Use a different account": forgets the pending sign-in in this browser. */
export async function cancelTwoFactorSignIn(): Promise<void> {
  await clearChallengeCookie();
}

/** Emails the code that confirms turning two-step verification on or off. */
export async function sendTwoFactorSettingsCode(
  purpose: TwoFactorSettingsPurpose
): Promise<TwoFactorCodeSent | TwoFactorFailure> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: SIGNED_OUT, restart: true };
  return sendSettingsCode(user, purpose);
}

/** Checks the settings code and turns the feature on or off. */
export async function confirmTwoFactorSettings(
  purpose: TwoFactorSettingsPurpose,
  code: string
): Promise<{ enabled: boolean } | TwoFactorFailure> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: SIGNED_OUT, restart: true };
  return confirmSettingsCode(user, purpose, code);
}
