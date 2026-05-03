"use client";

import { useState, KeyboardEvent } from "react";
import Link from "next/link";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Sparkles,
  Lock,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { categoriesQueryOptions, userCategoriesQueryOptions } from "@/lib/query/categories";
import { subscriptionStatusQueryOptions } from "@/lib/query/subscription-user";
import { queryKeys } from "@/lib/query/keys";
import {
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
} from "@/actions/categories";
import type { ExpenseCategoryRow } from "@/actions/categories";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { name: "Sky", bgClass: "bg-sky-50 dark:bg-sky-950/30" },
  { name: "Violet", bgClass: "bg-violet-50 dark:bg-violet-950/30" },
  { name: "Emerald", bgClass: "bg-emerald-50 dark:bg-emerald-950/30" },
  { name: "Amber", bgClass: "bg-amber-50 dark:bg-amber-950/30" },
  { name: "Rose", bgClass: "bg-rose-50 dark:bg-rose-950/30" },
  { name: "Orange", bgClass: "bg-orange-50 dark:bg-orange-950/30" },
  { name: "Teal", bgClass: "bg-teal-50 dark:bg-teal-950/30" },
  { name: "Indigo", bgClass: "bg-indigo-50 dark:bg-indigo-950/30" },
  { name: "Lime", bgClass: "bg-lime-50 dark:bg-lime-950/30" },
  { name: "Pink", bgClass: "bg-pink-50 dark:bg-pink-950/30" },
  { name: "Cyan", bgClass: "bg-cyan-50 dark:bg-cyan-950/30" },
  { name: "Red", bgClass: "bg-red-50 dark:bg-red-950/30" },
] as const;

type CategoryForm = {
  label: string;
  description: string;
  bgClass: string;
  lists: string[];
};

const EMPTY_FORM: CategoryForm = {
  label: "",
  description: "",
  bgClass: COLOR_OPTIONS[0].bgClass,
  lists: [],
};

/* ── sub-components ──────────────────────────────────────────── */

function CustomCategoryCard({
  cat,
  onEdit,
  onDelete,
}: {
  cat: ExpenseCategoryRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/60 p-5 shadow-sm transition-shadow hover:shadow-md",
        cat.bgClass || "bg-violet-50 dark:bg-violet-950/30"
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          <Tag className="h-3.5 w-3.5" />
        </span>
        <h3 className="flex-1 text-base font-semibold leading-snug text-foreground">{cat.label}</h3>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {cat.description && (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{cat.description}</p>
      )}

      {cat.lists.length > 0 && (
        <ul className="space-y-1">
          {cat.lists.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground/30" />
              {item}
            </li>
          ))}
        </ul>
      )}

      <Badge variant="secondary" className="mt-auto w-fit self-end pt-2 text-[10px] font-medium opacity-70">
        Custom
      </Badge>
    </div>
  );
}

function GlobalCategoryCard({
  index,
  cat,
}: {
  index: number;
  cat: ExpenseCategoryRow;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 p-5 shadow-sm transition-shadow hover:shadow-md",
        cat.bgClass || "bg-sky-50 dark:bg-sky-950/30"
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          {index + 1}
        </span>
        <h3 className="text-base font-semibold leading-snug text-foreground">{cat.label}</h3>
      </div>

      {cat.description && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{cat.description}</p>
      )}

      {cat.lists.length > 0 && (
        <ul className="space-y-1.5">
          {cat.lists.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground/30" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UpgradeBanner() {
  return (
    <div className="mb-8 flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Custom Categories</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upgrade to Pro or Premium to create your own expense categories and personalise your tracking.
          </p>
        </div>
      </div>
      <Button size="sm" asChild className="shrink-0">
        <Link href="/account/subscription">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Upgrade to Pro
        </Link>
      </Button>
    </div>
  );
}

/* ── main board ──────────────────────────────────────────────── */

export function CategoriesBoard() {
  const queryClient = useQueryClient();

  const { data: subscriptionStatus } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const { data: userCategories } = useSuspenseQuery(userCategoriesQueryOptions());
  const { data: allCategories } = useSuspenseQuery(categoriesQueryOptions());

  const canCustomize =
    (subscriptionStatus?.hasProAccess || subscriptionStatus?.hasPremiumAccess) ?? false;

  const userCategoryIds = new Set(userCategories.map((c) => c.id));
  const globalCategories = allCategories.filter((c) => !userCategoryIds.has(c.id));

  /* dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<ExpenseCategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditCat(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setNewItem("");
    setDialogOpen(true);
  }

  function openEdit(cat: ExpenseCategoryRow) {
    setEditCat(cat);
    setForm({
      label: cat.label,
      description: cat.description ?? "",
      bgClass: cat.bgClass || COLOR_OPTIONS[0].bgClass,
      lists: [...cat.lists],
    });
    setSaveError(null);
    setNewItem("");
    setDialogOpen(true);
  }

  function addListItem() {
    const item = newItem.trim();
    if (!item || form.lists.includes(item)) return;
    setForm((f) => ({ ...f, lists: [...f.lists, item] }));
    setNewItem("");
  }

  function handleItemKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addListItem();
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const result = editCat
      ? await updateUserCategory(editCat.id, {
          label: form.label,
          bgClass: form.bgClass,
          description: form.description,
          lists: form.lists,
        })
      : await createUserCategory({
          label: form.label,
          bgClass: form.bgClass,
          description: form.description,
          lists: form.lists,
        });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.userCategories() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteUserCategory(deleteTarget.id);
    setDeleting(false);
    if (result.error) return;
    setDeleteTarget(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.userCategories() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* back */}
      <Link
        href="/dashboard/expenses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Expenses
      </Link>

      {/* header */}
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold tracking-tight">Expense Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Categories help you organise your expenses and bills.
        </p>
      </div>

      {/* custom categories section */}
      {canCustomize ? (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Your Custom Categories</h2>
              <p className="text-sm text-muted-foreground">
                {userCategories.length === 0
                  ? "No custom categories yet."
                  : `${userCategories.length} custom ${userCategories.length === 1 ? "category" : "categories"}`}
              </p>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>

          {userCategories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Tag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No custom categories yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Create one to personalise your expense tracking.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={openAdd}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create your first category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userCategories.map((cat) => (
                <CustomCategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => setDeleteTarget(cat)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <UpgradeBanner />
      )}

      {/* standard categories section */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">Standard Categories</h2>
          <p className="text-sm text-muted-foreground">
            {`${globalCategories.length} built-in categories available to all users.`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {globalCategories.map((cat, index) => (
            <GlobalCategoryCard key={cat.id} index={index} cat={cat} />
          ))}
        </div>
      </section>

      {/* ── add / edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Custom Category"}</DialogTitle>
            <DialogDescription>
              {editCat
                ? "Update the details for your category."
                : "Create a new category to organise your expenses."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
          >
            {/* label */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-label">Name *</Label>
              <Input
                id="cat-label"
                autoFocus
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Entertainment"
                maxLength={60}
              />
            </div>

            {/* description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description (optional)"
                rows={2}
                maxLength={200}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    title={opt.name}
                    onClick={() => setForm((f) => ({ ...f, bgClass: opt.bgClass }))}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                      opt.bgClass,
                      form.bgClass === opt.bgClass
                        ? "scale-110 border-primary ring-2 ring-primary/30"
                        : "border-border/60 hover:border-border"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* items */}
            <div className="space-y-1.5">
              <Label>Items (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={handleItemKeyDown}
                  placeholder="Type an item and press Enter…"
                  maxLength={80}
                />
                <Button type="button" size="sm" variant="outline" onClick={addListItem} className="shrink-0">
                  Add
                </Button>
              </div>
              {form.lists.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.lists.map((item) => (
                    <Badge key={item} variant="secondary" className="gap-1 pr-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, lists: f.lists.filter((l) => l !== item) }))}
                        className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </form>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !form.label.trim()}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{editCat ? "Saving…" : "Creating…"}</>
              ) : editCat ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── delete confirm dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.label}</strong>? This action cannot be undone. Any expenses using this category will become uncategorised.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
