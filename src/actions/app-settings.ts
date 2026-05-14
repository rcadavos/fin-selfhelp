"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const OCR_KEY = "ocr_scanning_enabled";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "Forbidden." };
  return { ok: true };
}

function valueToBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

export async function getOcrEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", OCR_KEY)
      .maybeSingle();
    return valueToBool(data?.value, true);
  } catch {
    return true;
  }
}

export async function setOcrEnabled(enabled: boolean): Promise<{ error?: string }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { error: auth.error };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const admin = createServiceRoleClient();
    const { error } = await admin.from("app_settings").upsert({
      key: OCR_KEY,
      value: enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin/ocr");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update OCR setting." };
  }
}
