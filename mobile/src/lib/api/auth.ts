import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { isEmailTwoFactorEnabled, type TwoFactorSignInChallenge } from "@shared/two-factor";

import { postWebApi, type WebApiResult } from "@/lib/api/web";
import { AUTH_CALLBACK_PATH, WEB_API_ROUTES } from "@/lib/constants/app";
import { WEB_URL } from "@/lib/constants/env";
import { createPasswordCheckClient, supabase } from "@/lib/supabase";

type AuthResult = { error?: string };

/** `omnitrak://auth/callback` in a build; an `exp://…/--/auth/callback` URL in Expo Go. */
function authRedirectUrl(): string {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

/**
 * Runs the web's post-sign-in steps (the new-signup alert) for a session the app made.
 * Best effort: a failure here must never undo a sign-in that already worked.
 */
async function reportSignIn(accessToken: string): Promise<void> {
  if (!WEB_URL) return;
  try {
    await fetch(`${WEB_URL}${WEB_API_ROUTES.mobileSignIn}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Offline or the web app is unreachable; the next sign-in retries.
  }
}

/**
 * Checks the password on an in-memory client first, so nothing is stored and the app
 * stays on the sign-in screen until we know whether the account needs its emailed
 * code. Without two-step verification the session is then handed to the app client;
 * with it, the web revokes that session, emails a code and returns `twoFactor`.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult & { twoFactor?: TwoFactorSignInChallenge }> {
  const checker = createPasswordCheckClient();
  const { data, error } = await checker.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { error: error.message };

  if (isEmailTwoFactorEnabled(data.user)) {
    const started = await postWebApi<TwoFactorSignInChallenge>(WEB_API_ROUTES.twoFactorSignIn, {
      accessToken: data.session.access_token,
    });
    if (!started.ok) {
      // The web revokes the password session itself; if the call never got there, do it here.
      await checker.auth.signOut({ scope: "local" });
      return { error: started.error };
    }
    return { twoFactor: started.data };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) return { error: sessionError.message };
  void reportSignIn(data.session.access_token);
  return {};
}

/**
 * Sends the emailed code for a pending two-step sign-in. On success the web returns a
 * one-time token that becomes the app's session, and `UserProvider` takes it from there.
 */
export async function completeTwoFactorSignIn(
  challengeId: string,
  code: string,
): Promise<AuthResult & { restart?: boolean }> {
  const verified = await postWebApi<{ tokenHash: string }>(WEB_API_ROUTES.twoFactorSignInVerify, {
    body: { challengeId, code },
  });
  if (!verified.ok) return { error: verified.error, restart: verified.restart };

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: verified.data.tokenHash, type: "magiclink" });
  if (error || !data.session) {
    return { error: "We couldn't finish signing you in. Please sign in again.", restart: true };
  }
  void reportSignIn(data.session.access_token);
  return {};
}

/** Emails a new code for a pending two-step sign-in. */
export async function resendTwoFactorSignInCode(
  challengeId: string,
): Promise<WebApiResult<{ resendInSeconds: number }>> {
  return postWebApi<{ resendInSeconds: number }>(WEB_API_ROUTES.twoFactorSignInResend, { body: { challengeId } });
}

const exchanges = new Map<string, Promise<AuthResult>>();

/**
 * Redeems the one-time `code` a Google or magic-link sign-in returns with. On Android
 * the same redirect can reach both the auth browser session and the router, so each
 * code is exchanged once and both callers share the result.
 */
export function completeSignInWithCode(code: string): Promise<AuthResult> {
  let pending = exchanges.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) return { error: error.message };
      void reportSignIn(data.session.access_token);
      return {};
    });
    exchanges.set(code, pending);
  }
  return pending;
}

/** Supabase puts `code` in the query, and errors in the query or the hash. */
export function completeSignInFromUrl(url: string): Promise<AuthResult> {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const errorDescription =
    parsed.searchParams.get("error_description") ?? hash.get("error_description");
  if (errorDescription) return Promise.resolve({ error: errorDescription });

  const code = parsed.searchParams.get("code");
  if (!code) return Promise.resolve({ error: "Sign-in did not return a code. Please try again." });
  return completeSignInWithCode(code);
}

export async function signInWithGoogle(): Promise<AuthResult & { cancelled?: boolean }> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data.url) return { error: "Could not start Google sign-in." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { cancelled: true };
  return completeSignInFromUrl(result.url);
}

/**
 * Emails a one-time sign-in link. Like the web, this also creates the account when
 * the email is new. The link only works when opened on this device.
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl() },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
