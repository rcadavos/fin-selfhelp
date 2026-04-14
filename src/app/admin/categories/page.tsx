"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminCategoriesQueryOptions } from "@/lib/query/admin-categories";
import { categoriesQueryOptions } from "@/lib/query/categories";
import {
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  type ExpenseCategoryRow,
} from "@/actions/categories";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const BG_OPTIONS = [
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-sky-50 dark:bg-sky-950/30",
  "bg-slate-50 dark:bg-slate-800/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
  "bg-rose-50 dark:bg-rose-950/30",
  "bg-green-50 dark:bg-green-950/30",
  "bg-violet-50 dark:bg-violet-950/30",
  "bg-orange-50 dark:bg-orange-950/30",
  "bg-teal-50 dark:bg-teal-950/30",
  "bg-indigo-50 dark:bg-indigo-950/30",
  "bg-pink-50 dark:bg-pink-950/30",
  "bg-cyan-50 dark:bg-cyan-950/30",
  "bg-fuchsia-50 dark:bg-fuchsia-950/30",
  "bg-lime-50 dark:bg-lime-950/30",
  "bg-blue-50 dark:bg-blue-950/30",
  "bg-neutral-50 dark:bg-neutral-800/30",
];

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, error } = useQuery(adminCategoriesQueryOptions());
  const [addOpen, setAddOpen] = useState(false);
  const [editCat, setEditCat] = useState<ExpenseCategoryRow | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBgClass, setEditBgClass] = useState("");
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newBgClass, setNewBgClass] = useState(BG_OPTIONS[0]);
  const [actionError, setActionError] = useState<string | null>(null);

  function invalidateCategories() {
    queryClient.invalidateQueries({ queryKey: adminCategoriesQueryOptions().queryKey });
    queryClient.invalidateQueries({ queryKey: categoriesQueryOptions().queryKey });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createExpenseCategory({ id: newId, label: newLabel, bgClass: newBgClass });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidateCategories();
      setAddOpen(false);
      setNewId("");
      setNewLabel("");
      setNewBgClass(BG_OPTIONS[0]);
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label, bgClass }: { id: string; label: string; bgClass: string }) => {
      const result = await updateExpenseCategory(id, { label, bgClass });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidateCategories();
      setEditCat(null);
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteExpenseCategory(id);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidateCategories();
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  function openAdd() {
    setAddOpen(true);
    setNewId("");
    setNewLabel("");
    setNewBgClass(BG_OPTIONS[0]);
    setActionError(null);
  }

  function openEdit(cat: ExpenseCategoryRow) {
    setEditCat(cat);
    setEditLabel(cat.label);
    setEditBgClass(cat.bgClass);
    setActionError(null);
  }

  function submitAdd() {
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    if (!id || !newLabel.trim()) {
      setActionError("ID and label are required.");
      return;
    }
    createMutation.mutate();
  }

  function submitEdit() {
    if (!editCat) return;
    const label = editLabel.trim();
    if (!label) {
      setActionError("Label is required.");
      return;
    }
    updateMutation.mutate({ id: editCat.id, label, bgClass: editBgClass });
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Expense categories</CardTitle>
              <CardDescription>
                Manage categories shown in the app. Changes apply to dropdowns and labels.
              </CardDescription>
            </div>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{(error as Error).message}</p>
          )}
          {actionError && (
            <p className="mb-4 text-sm text-destructive">{actionError}</p>
          )}
          {categories.length === 0 && !error ? (
            <p className="text-muted-foreground">No categories. Run migration 009_expense_categories.sql to seed.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-sm">{cat.id}</TableCell>
                    <TableCell>
                      {editCat?.id === cat.id ? (
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 max-w-xs"
                        />
                      ) : (
                        cat.label
                      )}
                    </TableCell>
                    <TableCell>
                      {editCat?.id === cat.id ? (
                        <select
                          value={editBgClass}
                          onChange={(e) => setEditBgClass(e.target.value)}
                          className="h-8 rounded-md border bg-background px-2 text-sm max-w-[200px] w-full"
                        >
                          {BG_OPTIONS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg.replace(" dark:.*", "")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-xs truncate block max-w-[180px]">{cat.bgClass}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editCat?.id === cat.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditCat(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={submitEdit}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Delete category "${cat.label}"? Entries using it may show as unknown.`)) {
                                deleteMutation.mutate(cat.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              ID is used in the database (e.g. home_maintenance). Label is shown in the app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-id">ID</Label>
              <Input
                id="new-id"
                placeholder="e.g. home_maintenance"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stored as lowercase with spaces → underscores.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-label">Label</Label>
              <Input
                id="new-label"
                placeholder="e.g. Home Maintenance"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-bg">Background class</Label>
              <select
                id="new-bg"
                value={newBgClass}
                onChange={(e) => setNewBgClass(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {BG_OPTIONS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg.replace(" dark:.*", "")}
                  </option>
                ))}
              </select>
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitAdd}
              disabled={!newId.trim() || !newLabel.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/admin">Back to admin</Link>
        </Button>
      </div>
    </main>
  );
}
