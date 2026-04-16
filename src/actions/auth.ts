"use server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import {
  loginSchema,
  passwordResetRequestSchema,
  signupSchema,
} from "@/lib/validation/forms";
import { redirect } from "next/navigation";

function normalizeSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
}

/** OAuth (Google): redirects to provider; on failure returns `{ error }`. */
export async function signInWithGoogle(
  formData: FormData
): Promise<{ error: string } | void> {
  const siteUrl = normalizeSiteUrl();
  if (!siteUrl) {
    return { error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set." };
  }

  const supabase = await createClient();
  const nextPath = safeNextPath(formData.get("next") as string | null);
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "Could not start Google sign-in." };
  redirect(data.url);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  const next = safeNextPath(formData.get("next") as string | null);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid sign up details." };
  const { email, password } = parsed.data;

  const siteUrl = normalizeSiteUrl();
  if (!siteUrl) {
    return { error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set." };
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your email to confirm your account." };
}

export async function signInWithOtp(formData: FormData) {
  const supabase = await createClient();
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  const { email } = parsed.data;

  const siteUrl = normalizeSiteUrl();
  if (!siteUrl) {
    return { error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set." };
  }
  const nextPath = safeNextPath(formData.get("next") as string | null);
  const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your email for the one-time sign-in link." };
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  const { email } = parsed.data;

  const siteUrl = normalizeSiteUrl();
  if (!siteUrl) {
    return { error: "Server misconfiguration: NEXT_PUBLIC_SITE_URL is not set." };
  }
  const redirectTo = `${siteUrl}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your email for the password reset link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
