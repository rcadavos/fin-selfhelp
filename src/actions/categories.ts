"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ExpenseCategoryRow = {
  id: string;
  label: string;
  bgClass: string;
  sortOrder: number;
  description: string | null;
  lists: string[];
};

/** Returns expense categories for the app (dropdowns, labels, detail page). Uses DB; falls back to empty if table missing. */
export async function getExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, label, bg_class, sort_order, description, lists")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    bgClass: row.bg_class ?? "",
    sortOrder: Number(row.sort_order),
    description: (row.description as string | null) ?? null,
    lists: Array.isArray(row.lists) ? (row.lists as string[]) : [],
  }));
}

/** Admin: list categories (with sort_order). */
export async function getExpenseCategoriesForAdmin(): Promise<{
  categories: ExpenseCategoryRow[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { categories: [], error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { categories: [], error: "Forbidden." };
    const { data, error } = await admin
      .from("expense_categories")
      .select("id, label, bg_class, sort_order, description, lists")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) return { categories: [], error: error.message };
    const categories = (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      bgClass: row.bg_class ?? "",
      sortOrder: Number(row.sort_order),
      description: (row.description as string | null) ?? null,
      lists: Array.isArray(row.lists) ? (row.lists as string[]) : [],
    }));
    return { categories };
  } catch (e) {
    return { categories: [], error: e instanceof Error ? e.message : "Failed to load categories." };
  }
}

/** Admin: create category. */
export async function createExpenseCategory(params: {
  id: string;
  label: string;
  bgClass?: string;
  description?: string;
  lists?: string[];
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    const id = params.id.trim().toLowerCase().replace(/\s+/g, "_");
    if (!id) return { error: "ID is required." };
    if (!params.label.trim()) return { error: "Label is required." };
    const { error } = await supabase
      .from("expense_categories")
      .insert({
        id,
        label: params.label.trim(),
        bg_class: (params.bgClass ?? "").trim() || "bg-neutral-50 dark:bg-neutral-800/30",
        sort_order: 999,
        description: params.description?.trim() || null,
        lists: params.lists ?? [],
      });
    if (error) return { error: error.message };
    revalidatePath("/admin/categories");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-expenses");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create category." };
  }
}

/** Admin: update category. */
export async function updateExpenseCategory(
  id: string,
  params: { label?: string; bgClass?: string; description?: string; lists?: string[] }
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    const updates: Record<string, unknown> = {};
    if (params.label !== undefined) updates.label = params.label.trim();
    if (params.bgClass !== undefined) updates.bg_class = params.bgClass.trim();
    if (params.description !== undefined) updates.description = params.description.trim() || null;
    if (params.lists !== undefined) updates.lists = params.lists;
    if (Object.keys(updates).length === 0) return {};
    const { error } = await supabase
      .from("expense_categories")
      .update(updates)
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/categories");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-expenses");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update category." };
  }
}

/** Admin: update sort_order for all categories in one call. Pass IDs in desired order. */
export async function reorderCategories(orderedIds: string[]): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    await Promise.all(
      orderedIds.map((id, index) =>
        admin
          .from("expense_categories")
          .update({ sort_order: index + 1 })
          .eq("id", id)
      )
    );
    revalidatePath("/admin/categories");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-expenses");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder categories." };
  }
}

/** Admin: delete category. */
export async function deleteExpenseCategory(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/categories");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/my-expenses");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete category." };
  }
}
