import type { NextResponse } from "next/server";
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/constants/referral";

/**
 * Referral-code cookie plumbing, shared by the middleware, the `/r/<code>`
 * short link, and the server actions that claim a pending referral. Kept free
 * of Node-only imports so the middleware runtime can use it.
 */

/**
 * Uppercases and validates a code from a URL. Returns null for anything that
 * cannot be one of our codes, so a junk `?ref=` never reaches the database.
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== REFERRAL_CODE_LENGTH) return null;
  for (const char of code) {
    if (!REFERRAL_CODE_ALPHABET.includes(char)) return null;
  }
  return code;
}

/** Cookie attributes — readable by the server only, and lax so link clicks carry it. */
export const REFERRAL_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Stores a referral code on a middleware or route-handler response.
 *
 * First touch wins: if the visitor already carries a pending code, it is left
 * alone so the friend who actually got them here keeps the credit.
 */
export function rememberReferralCode(
  response: NextResponse,
  rawCode: string | null | undefined,
  existingCode?: string | null
): boolean {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;
  if (normalizeReferralCode(existingCode)) return false;
  response.cookies.set(REFERRAL_COOKIE_NAME, code, REFERRAL_COOKIE_OPTIONS);
  return true;
}
