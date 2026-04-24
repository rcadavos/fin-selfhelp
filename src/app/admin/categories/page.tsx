"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  reorderCategories,
  type ExpenseCategoryRow,
} from "@/actions/categories";
import { GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Lists tag input ──────────────────────────────────────────────────────────

function ListsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const item = draft.trim();
    if (!item || value.includes(item)) return;
    onChange([...value, item]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type an item and press Enter…"
          className="flex-1 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} title="Add item">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
            >
              <span className="mr-2 flex-1 truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remove item"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableCategoryRow({
  cat,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  cat: ExpenseCategoryRow;
  index: number;
  onEdit: (cat: ExpenseCategoryRow) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(cat.bgClass, isDragging && "opacity-50 ring-2 ring-primary/30")}
      {...attributes}
    >
      {/* Drag handle */}
      <TableCell className="w-8 pr-0">
        <button
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>

      {/* Sort number */}
      <TableCell className="w-8 text-center text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </TableCell>

      {/* ID */}
      <TableCell className="font-mono text-xs text-muted-foreground">{cat.id}</TableCell>

      {/* Label */}
      <TableCell className="font-medium">{cat.label}</TableCell>

      {/* Colour swatch */}
      <TableCell>
        <span
          className={cn("inline-block h-5 w-5 rounded border", cat.bgClass)}
          title={cat.bgClass}
        />
      </TableCell>

      {/* Description (truncated) */}
      <TableCell className="max-w-[200px]">
        <span className="block truncate text-xs text-muted-foreground">
          {cat.description ?? <span className="italic opacity-40">—</span>}
        </span>
      </TableCell>

      {/* Lists count */}
      <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
        {cat.lists.length}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            title="Edit category"
            aria-label="Edit category"
            onClick={() => onEdit(cat)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            title="Delete category"
            aria-label="Delete category"
            disabled={isDeleting}
            onClick={() => onDelete(cat.id)}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Category form fields (shared by add + edit dialogs) ─────────────────────

interface CatFormState {
  label: string;
  bgClass: string;
  description: string;
  lists: string[];
}

function CategoryFormFields({
  form,
  setForm,
  showId,
  idValue,
  onIdChange,
}: {
  form: CatFormState;
  setForm: (f: CatFormState) => void;
  showId?: boolean;
  idValue?: string;
  onIdChange?: (v: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {showId && (
        <div className="grid gap-1.5">
          <Label htmlFor="cat-id">ID</Label>
          <Input
            id="cat-id"
            placeholder="e.g. home_maintenance"
            value={idValue}
            onChange={(e) => onIdChange?.(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored as lowercase with spaces → underscores.
          </p>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="cat-label">Label</Label>
        <Input
          id="cat-label"
          placeholder="e.g. Home Maintenance"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Background color</Label>
        <div className="flex flex-wrap gap-1.5">
          {BG_OPTIONS.map((bg) => (
            <button
              key={bg}
              type="button"
              title={bg.split(" ")[0]}
              onClick={() => setForm({ ...form, bgClass: bg })}
              className={cn(
                "h-7 w-7 rounded border-2 transition-all",
                bg,
                form.bgClass === bg
                  ? "border-foreground shadow-sm ring-1 ring-foreground/50"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{form.bgClass.split(" ")[0]}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cat-desc">Description</Label>
        <textarea
          id="cat-desc"
          rows={2}
          placeholder="Short description of what belongs in this category…"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>List items</Label>
        <ListsInput
          value={form.lists}
          onChange={(lists) => setForm({ ...form, lists })}
        />
        <p className="text-xs text-muted-foreground">
          Example items shown on the categories page.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM: CatFormState = { label: "", bgClass: BG_OPTIONS[0], description: "", lists: [] };

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: dbCategories, isLoading, error } = useQuery(adminCategoriesQueryOptions());

  // Local ordered list for optimistic drag-and-drop.
  // Only sync when the query returns a stable reference (never sync undefined).
  const [orderedCats, setOrderedCats] = useState<ExpenseCategoryRow[]>([]);

  useEffect(() => {
    if (dbCategories !== undefined) setOrderedCats(dbCategories);
  }, [dbCategories]);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [addForm, setAddForm] = useState<CatFormState>(EMPTY_FORM);

  const [editCat, setEditCat] = useState<ExpenseCategoryRow | null>(null);
  const [editForm, setEditForm] = useState<CatFormState>(EMPTY_FORM);

  const [actionError, setActionError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: adminCategoriesQueryOptions().queryKey });
    queryClient.invalidateQueries({ queryKey: categoriesQueryOptions().queryKey });
  }

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createExpenseCategory({
        id: newId,
        label: addForm.label,
        bgClass: addForm.bgClass,
        description: addForm.description,
        lists: addForm.lists,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setNewId("");
      setAddForm(EMPTY_FORM);
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCat) return;
      const result = await updateExpenseCategory(editCat.id, {
        label: editForm.label,
        bgClass: editForm.bgClass,
        description: editForm.description,
        lists: editForm.lists,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidate();
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
      invalidate();
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const result = await reorderCategories(orderedIds);
      if (result.error) throw new Error(result.error);
    },
    onError: (err: Error) => {
      setActionError(err.message);
      // Roll back optimistic update
      if (dbCategories !== undefined) setOrderedCats(dbCategories);
    },
  });

  // ── DnD ──

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = orderedCats.map((c) => c.id);
    const newOrder = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string));
    // Optimistic update
    setOrderedCats(newOrder.map((id) => orderedCats.find((c) => c.id === id)!));
    reorderMutation.mutate(newOrder);
  }

  // ── Handlers ──

  function openAdd() {
    setNewId("");
    setAddForm(EMPTY_FORM);
    setActionError(null);
    setAddOpen(true);
  }

  function openEdit(cat: ExpenseCategoryRow) {
    setEditCat(cat);
    setEditForm({
      label: cat.label,
      bgClass: cat.bgClass,
      description: cat.description ?? "",
      lists: cat.lists,
    });
    setActionError(null);
  }

  function handleDelete(id: string) {
    const cat = orderedCats.find((c) => c.id === id);
    if (!confirm(`Delete category "${cat?.label ?? id}"?\nEntries using it may show as unknown.`)) return;
    deleteMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Expense categories</CardTitle>
              <CardDescription>
                Manage categories used in dropdowns and the categories page. Drag rows to reorder.
              </CardDescription>
            </div>
            <Button onClick={openAdd} title="Add category" aria-label="Add category">
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(error || actionError) && (
            <p className="mb-4 text-sm text-destructive">
              {actionError ?? (error as Error).message}
            </p>
          )}
          {reorderMutation.isPending && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving order…
            </p>
          )}

          {orderedCats.length === 0 && !error ? (
            <p className="text-muted-foreground">No categories. Run migration 009_expense_categories.sql to seed.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedCats.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="w-10">Color</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-12 text-center">Items</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedCats.map((cat, index) => (
                      <SortableCategoryRow
                        key={cat.id}
                        cat={cat}
                        index={index}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        isDeleting={
                          deleteMutation.isPending &&
                          deleteMutation.variables === cat.id
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* ── Add dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) setAddOpen(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              ID is used in the database (lowercase, underscores). Label is shown in the app.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <CategoryFormFields
              form={addForm}
              setForm={setAddForm}
              showId
              idValue={newId}
              onIdChange={setNewId}
            />
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                className="w-1/2"
                onClick={() => createMutation.mutate()}
                disabled={!newId.trim() || !addForm.label.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editCat} onOpenChange={(open) => { if (!open) setEditCat(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Editing <span className="font-mono text-foreground">{editCat?.id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <CategoryFormFields form={editForm} setForm={setEditForm} />
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setEditCat(null)}>
                Cancel
              </Button>
              <Button
                className="w-1/2"
                onClick={() => updateMutation.mutate()}
                disabled={!editForm.label.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
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
