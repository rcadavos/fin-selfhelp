"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { redirect } from "next/navigation";
import { sendWelcomeEmail, sendPhoneChangedEmail } from "@/lib/email";

function normalizeSiteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");
  // Dev fallback so auth flows still work when NEXT_PUBLIC_SITE_URL is unset.
  return "http://localhost:3003";
}

/** OAuth (Google): redirects to provider; on failure returns `{ error }`. */
export async function signInWithGoogle(
  formData: FormData
): Promise<{ error: string } | void> {
  const siteUrl = normalizeSiteUrl();
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  const next = safeNextPath(formData.get("next") as string | null);
  return { error: null as string | null, next };
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const siteUrl = normalizeSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/setup")}`,
      data: {
        full_name: fullName || undefined,
        welcome_email_pending: true,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, Supabase returns a session immediately —
  // send welcome email now since there's no confirmation step.
  if (data.session) {
    sendWelcomeEmail({ to: email, name: fullName || undefined }).catch(() => {});
    return { next: "/setup", message: "Account created! Logging you in..." };
  }

  return { message: "Check your email to confirm your account." };
}

export async function signInWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  if (!email?.trim()) {
    return { error: "Email is required." };
  }

  const siteUrl = normalizeSiteUrl();
  const nextPath = safeNextPath(formData.get("next") as string | null);
  const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
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
  const email = formData.get("email") as string;

  if (!email?.trim()) {
    return { error: "Email is required." };
  }

  const siteUrl = normalizeSiteUrl();
  const redirectTo = `${siteUrl}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your email for the password reset link." };
}

export async function updateProfile(params: {
  fullName: string;
  phone: string;
  birthMonth?: number | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated." };

  const prevPhone = (user.user_metadata?.phone as string | undefined)?.trim() ?? user.phone ?? "";
  const newPhone = params.phone.trim();

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: params.fullName.trim() || undefined,
      phone: newPhone || undefined,
      birth_month: params.birthMonth ?? null,
    },
  });

  if (error) return { error: error.message };

  if (newPhone && newPhone !== prevPhone && user.email) {
    const name = (user.user_metadata?.full_name as string | undefined) ?? params.fullName;
    sendPhoneChangedEmail({ to: user.email, name, newPhone }).catch(() => {});
  }

  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null as string | null };
}

export async function updatePrivacySettings(params: {
  profileVisible: boolean;
  phoneVisible: boolean;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({
    data: {
      profile_visible: params.profileVisible,
      phone_visible: params.phoneVisible,
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteSelfAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated." };

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: error.message };
    await supabase.auth.signOut({ scope: "local" });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete account." };
  }
}
