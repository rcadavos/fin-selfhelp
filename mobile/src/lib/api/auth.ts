import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { AUTH_CALLBACK_PATH, WEB_API_ROUTES } from "@/lib/constants/app";
import { WEB_URL } from "@/lib/constants/env";
import { supabase } from "@/lib/supabase";

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

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { error: error.message };
  void reportSignIn(data.session.access_token);
  return {};
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
