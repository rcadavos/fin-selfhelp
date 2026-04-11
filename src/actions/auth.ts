"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  const next = (formData.get("next") as string)?.trim() || "/dashboard";
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your email to confirm your account." };
}

export async function signInWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  if (!email?.trim()) {
    return { error: "Email is required." };
  }

  const next = (formData.get("next") as string)?.trim() || "/dashboard";
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback${next && next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : ""}`;
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

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
