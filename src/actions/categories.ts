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

type RawCategoryRow = {
  id: string;
  label: string;
  bg_class: string;
  sort_order: number;
  description: string | null;
  lists: unknown;
  user_id?: string | null;
};

function mapRow(row: RawCategoryRow): ExpenseCategoryRow {
  return {
    id: row.id,
    label: row.label,
    bgClass: row.bg_class ?? "",
    sortOrder: Number(row.sort_order),
    description: (row.description as string | null) ?? null,
    lists: Array.isArray(row.lists) ? (row.lists as string[]) : [],
  };
}

/**
 * Returns expense categories for the app (dropdowns, labels, detail page).
 * Returns global categories (user_id IS NULL) + current user's custom categories.
 * Requires a `user_id` column on `expense_categories` — falls back to all-global if missing.
 *
 * DB migration required:
 *   ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
 *   CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
 */
export async function getExpenseCategories(): Promise<ExpenseCategoryRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const filterExpr = user
    ? `user_id.is.null,user_id.eq.${user.id}`
    : null;

  const baseQuery = supabase
    .from("expense_categories")
    .select("id, label, bg_class, sort_order, description, lists, user_id")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const { data, error } = await (filterExpr
    ? baseQuery.or(filterExpr)
    : baseQuery.is("user_id", null));

  if (error) {
    const { data: fallback } = await supabase
      .from("expense_categories")
      .select("id, label, bg_class, sort_order, description, lists")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    return (fallback ?? []).map((r) => mapRow(r as RawCategoryRow));
  }

  const rows = (data ?? []) as RawCategoryRow[];
  const userRows = rows.filter((r) => r.user_id != null);
  const globalRows = rows.filter((r) => r.user_id == null);
  return [...userRows.map(mapRow), ...globalRows.map(mapRow)];
}

/** Returns only the current user's custom categories. */
export async function getUserCustomCategories(): Promise<ExpenseCategoryRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, label, bg_class, sort_order, description, lists")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => mapRow(r as RawCategoryRow));
}

/** Pro/Premium: create a custom category for the current user. */
export async function createUserCategory(params: {
  label: string;
  bgClass?: string;
  description?: string;
  lists?: string[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  if (!params.label.trim()) return { error: "Name is required." };
  const id = `uc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase
    .from("expense_categories")
    .insert({
      id,
      label: params.label.trim(),
      bg_class: params.bgClass?.trim() || "bg-violet-50 dark:bg-violet-950/30",
      sort_order: 0,
      description: params.description?.trim() || null,
      lists: params.lists ?? [],
      user_id: user.id,
    });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/expenses/categories");
  revalidatePath("/dashboard/expenses");
  return {};
}

/** Pro/Premium: update the current user's own custom category. */
export async function updateUserCategory(
  id: string,
  params: { label?: string; bgClass?: string; description?: string; lists?: string[] }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const updates: Record<string, unknown> = {};
  if (params.label !== undefined) updates.label = params.label.trim();
  if (params.bgClass !== undefined) updates.bg_class = params.bgClass.trim();
  if (params.description !== undefined) updates.description = params.description.trim() || null;
  if (params.lists !== undefined) updates.lists = params.lists;
  if (Object.keys(updates).length === 0) return {};
  const { error } = await supabase
    .from("expense_categories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/expenses/categories");
  revalidatePath("/dashboard/expenses");
  return {};
}

/** Pro/Premium: delete the current user's own custom category. */
export async function deleteUserCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/expenses/categories");
  revalidatePath("/dashboard/expenses");
  return {};
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
    revalidatePath("/dashboard/expenses");
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
    revalidatePath("/dashboard/expenses");
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
    revalidatePath("/dashboard/expenses");
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
    revalidatePath("/dashboard/expenses");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete category." };
  }
}
