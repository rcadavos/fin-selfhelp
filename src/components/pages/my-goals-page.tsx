"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentHeader } from "@/components/app/content-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusFilterDropdown } from "@/components/ui/status-filter-dropdown";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { goalsQueryOptions } from "@/lib/query/my-goals";
import {
  readGoalsCategorizedPreference,
  writeGoalsCategorizedPreference,
} from "@/lib/goals-categorized-preference";
import { queryKeys } from "@/lib/query/keys";
import {
  createGoal,
  deleteGoal,
  updateGoal,
  type GoalEntryRow,
  type GoalType,
} from "@/actions/goals";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CircleOff,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
  PartyPopper,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

const LS_GOAL_ORDER = "goal_order_v1";

function goalTypeDotClass(t: GoalType): string {
  if (t === "lifetime") return "bg-violet-500";
  if (t === "long_term") return "bg-sky-500";
  return "bg-emerald-500";
}

type SortableItemProps = {
  setNodeRef: (el: HTMLElement | null) => void;
  style: React.CSSProperties;
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

function SortableGoalWrapper({
  id,
  children,
}: {
  id: string;
  children: (sortable: SortableItemProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return children({
    setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition: transition ?? undefined },
    attributes: attributes as React.HTMLAttributes<HTMLElement>,
    listeners,
    isDragging,
  });
}

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "short_term", label: "Short-term" },
  { value: "long_term", label: "Long-term" },
  { value: "lifetime", label: "Lifetime" },
];

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const ACHIEVED_NONE = "__none__";


function yearOptions(): number[] {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = y; i >= 1990; i--) out.push(i);
  return out;
}

function clampYearChoice(y: string, maxYear: number): string {
  const n = Number(y);
  if (!Number.isFinite(n)) return String(maxYear);
  if (n > maxYear) return String(maxYear);
  if (n < 1990) return "1990";
  return String(n);
}

function isGoalAchieved(g: GoalEntryRow): boolean {
  return g.date_achieved_month != null && g.date_achieved_year != null;
}

function goalTypeBadgeClass(t: GoalType): string {
  if (t === "lifetime") return "border-violet-400/60 bg-violet-500/15 text-violet-800 dark:text-violet-200";
  if (t === "long_term") return "border-sky-400/60 bg-sky-500/15 text-sky-900 dark:text-sky-100";
  return "border-emerald-400/60 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
}

/** Display like "Jan 2023" */
function formatMonthYearShort(month: number, year: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

function goalRowToInput(g: GoalEntryRow) {
  return {
    name: g.name,
    date_set_month: g.date_set_month,
    date_set_year: g.date_set_year,
    date_achieved_month: g.date_achieved_month,
    date_achieved_year: g.date_achieved_year,
    goal_type: g.goal_type,
    notes: g.notes?.trim() ? g.notes.trim() : null,
  };
}

type FormState = {
  name: string;
  set_month: string;
  set_year: string;
  achieved_month: string;
  achieved_year: string;
  goal_type: GoalType;
  notes: string;
};

function emptyForm(): FormState {
  const d = new Date();
  return {
    name: "",
    set_month: String(d.getMonth() + 1),
    set_year: String(d.getFullYear()),
    achieved_month: ACHIEVED_NONE,
    achieved_year: ACHIEVED_NONE,
    goal_type: "short_term",
    notes: "",
  };
}

function rowToForm(g: GoalEntryRow): FormState {
  const maxY = new Date().getFullYear();
  const ay =
    g.date_achieved_year != null ? clampYearChoice(String(g.date_achieved_year), maxY) : ACHIEVED_NONE;
  return {
    name: g.name,
    set_month: String(g.date_set_month),
    set_year: clampYearChoice(String(g.date_set_year), maxY),
    achieved_month:
      g.date_achieved_month != null ? String(g.date_achieved_month) : ACHIEVED_NONE,
    achieved_year: ay === ACHIEVED_NONE ? ACHIEVED_NONE : ay,
    goal_type: g.goal_type,
    notes: g.notes ?? "",
  };
}

function formToPayload(f: FormState) {
  const achievedM =
    f.achieved_month === ACHIEVED_NONE || f.achieved_month === ""
      ? null
      : Number(f.achieved_month);
  const achievedY =
    f.achieved_year === ACHIEVED_NONE || f.achieved_year === "" ? null : Number(f.achieved_year);
  return {
    name: f.name,
    date_set_month: Number(f.set_month),
    date_set_year: Number(f.set_year),
    date_achieved_month: achievedM,
    date_achieved_year: achievedY,
    goal_type: f.goal_type,
    notes: f.notes.trim() ? f.notes.trim() : null,
  };
}

export function MyGoalsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const queryClient = useQueryClient();
  const { showError } = useSnackbar();
  const goalsQuery = useQuery({
    ...goalsQueryOptions(),
    enabled: !!user && !loading,
  });
  const goals = goalsQuery.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [goalOrder, setGoalOrder] = useState<string[]>([]);
  const goalOrderLoaded = useRef(false);

  const [goalsCategorized, setGoalsCategorized] = useState(false);
  const [filterAchieved, setFilterAchieved] = useState(false);
  const [filterNotYet, setFilterNotYet] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [draftFilterAchieved, setDraftFilterAchieved] = useState(false);
  const [draftFilterNotYet, setDraftFilterNotYet] = useState(false);

  useEffect(() => {
    if (goalOrderLoaded.current) return;
    goalOrderLoaded.current = true;
    try {
      const saved = localStorage.getItem(LS_GOAL_ORDER);
      if (saved) setGoalOrder(JSON.parse(saved) as string[]);
    } catch {}
  }, []);

  useEffect(() => {
    const stored = readGoalsCategorizedPreference();
    if (stored !== null) setGoalsCategorized(stored);
  }, []);

  useEffect(() => {
    if (!filterMenuOpen) return;
    setDraftFilterAchieved(filterAchieved);
    setDraftFilterNotYet(filterNotYet);
  }, [filterMenuOpen, filterAchieved, filterNotYet]);

  const setGoalsCategorizedPersisted = useCallback((next: boolean) => {
    setGoalsCategorized(next);
    writeGoalsCategorizedPreference(next);
  }, []);

  const listGoals = useMemo(() => {
    const noFilter = !filterAchieved && !filterNotYet;
    const filtered = noFilter
      ? goals
      : goals.filter((g) => {
        const a = isGoalAchieved(g);
        if (a) return filterAchieved;
        return filterNotYet;
      });
    const typeOrder: GoalType[] = ["short_term", "long_term", "lifetime"];
    const achievementRank = (g: GoalEntryRow) =>
      g.date_achieved_year != null && g.date_achieved_month != null
        ? g.date_achieved_year * 12 + g.date_achieved_month
        : 0;
    return [...filtered].sort((a, b) => {
      const aDone = isGoalAchieved(a);
      const bDone = isGoalAchieved(b);
      if (aDone !== bDone) return aDone ? -1 : 1;
      if (aDone && bDone) {
        const diff = achievementRank(b) - achievementRank(a);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      const ra = typeOrder.indexOf(a.goal_type);
      const rb = typeOrder.indexOf(b.goal_type);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [goals, filterAchieved, filterNotYet]);

  const goalGroups = useMemo(
    () =>
      GOAL_TYPES.map(({ value, label }) => ({
        type: value,
        label,
        goals: listGoals.filter((g) => g.goal_type === value),
      })),
    [listGoals]
  );

  const orderedGoals = useMemo(() => {
    if (!goalOrder.length) return listGoals;
    const rankOf = new Map(goalOrder.map((id, i) => [id, i]));
    return [...listGoals].sort((a, b) => (rankOf.get(a.id) ?? 9999) - (rankOf.get(b.id) ?? 9999));
  }, [listGoals, goalOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeFilterCount = Number(filterAchieved) + Number(filterNotYet);

  const invalidateGoals = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
  }, [queryClient]);

  function handleGoalDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = orderedGoals.map((g) => g.id);
    const newOrder = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string));
    setGoalOrder(newOrder);
    try {
      localStorage.setItem(LS_GOAL_ORDER, JSON.stringify(newOrder));
    } catch {}
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (g: GoalEntryRow) => {
    setEditingId(g.id);
    setForm(rowToForm(g));
    setDialogOpen(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = editingId ? await updateGoal(editingId, payload) : await createGoal(payload);
      if (res.error) {
        showError(res.error);
        return;
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      invalidateGoals();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGoal(id: string) {
    setDeletingId(id);
    const res = await deleteGoal(id);
    setDeletingId(null);
    if (res.error) {
      showError(res.error);
      return;
    }
    invalidateGoals();
    if (editingId === id) {
      setDialogOpen(false);
      setEditingId(null);
    }
  }

  const handleMarkAchievedNow = useCallback(
    async (g: GoalEntryRow) => {
      const now = new Date();
      const optimisticMonth = now.getMonth() + 1;
      const optimisticYear = now.getFullYear();
      const goalsKey = queryKeys.goals();
      const prevGoals = queryClient.getQueryData<GoalEntryRow[]>(goalsKey);
      queryClient.setQueryData<GoalEntryRow[]>(goalsKey, (old) =>
        (old ?? []).map((row) =>
          row.id === g.id
            ? { ...row, date_achieved_month: optimisticMonth, date_achieved_year: optimisticYear }
            : row
        )
      );
      const res = await updateGoal(g.id, {
        ...goalRowToInput(g),
        date_achieved_month: optimisticMonth,
        date_achieved_year: optimisticYear,
      });
      if (res.error) {
        queryClient.setQueryData(goalsKey, prevGoals);
        showError(res.error);
        return;
      }
      invalidateGoals();
    },
    [showError, invalidateGoals, queryClient]
  );

  const handleUnmarkAchieved = useCallback(
    async (g: GoalEntryRow) => {
      if (!confirm("Undo marking this goal as achieved?")) return;
      const goalsKey = queryKeys.goals();
      const prevGoals = queryClient.getQueryData<GoalEntryRow[]>(goalsKey);
      queryClient.setQueryData<GoalEntryRow[]>(goalsKey, (old) =>
        (old ?? []).map((row) =>
          row.id === g.id
            ? { ...row, date_achieved_month: null, date_achieved_year: null }
            : row
        )
      );
      const res = await updateGoal(g.id, {
        ...goalRowToInput(g),
        date_achieved_month: null,
        date_achieved_year: null,
      });
      if (res.error) {
        queryClient.setQueryData(goalsKey, prevGoals);
        showError(res.error);
        return;
      }
      invalidateGoals();
    },
    [showError, invalidateGoals, queryClient]
  );

  const years = useMemo(() => yearOptions(), []);

  const fetchErr = goalsQuery.isError
    ? goalsQuery.error instanceof Error
      ? goalsQuery.error.message
      : "Could not load goals."
    : null;

  const renderGoalListItem = (g: GoalEntryRow, sortable?: SortableItemProps) => {
    const achieved = isGoalAchieved(g);
    const typeLabel = GOAL_TYPES.find((t) => t.value === g.goal_type)?.label ?? g.goal_type;
    const achievedShort =
      achieved && g.date_achieved_month != null && g.date_achieved_year != null
        ? formatMonthYearShort(g.date_achieved_month, g.date_achieved_year)
        : null;
    return (
      <li
        key={g.id}
        ref={sortable?.setNodeRef}
        style={sortable?.style}
        {...(sortable?.attributes ?? {})}
      >
        <div
          onClick={() => openEdit(g)}
          className={cn(
            "flex cursor-pointer select-none items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm transition-shadow",
            achieved ? "border-emerald-400/50 bg-emerald-500/5 dark:bg-emerald-900/20" : "",
            sortable?.isDragging
              ? "z-50 opacity-50 shadow-lg ring-2 ring-primary/30"
              : "hover:border-primary/30 hover:shadow-md"
          )}
        >
          {/* Drag handle */}
          {sortable && (
            <button
              {...sortable.listeners}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
              tabIndex={-1}
              aria-label="Reorder goal"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          {/* Type dot */}
          <span className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", goalTypeDotClass(g.goal_type))} />

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn(
                "truncate text-sm font-medium leading-tight",
                achieved && "text-emerald-700 dark:text-emerald-300"
              )}>
                {g.name}
              </p>
              <Badge
                variant="outline"
                className={cn("flex-shrink-0 text-[10px] font-medium", goalTypeBadgeClass(g.goal_type))}
              >
                {typeLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Set {formatMonthYearShort(g.date_set_month, g.date_set_year)}
              {achieved && achievedShort && (
                <span className="ml-1.5">· Achieved {achievedShort}</span>
              )}
            </p>
            {g.notes?.trim() && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/70 italic">
                {g.notes.trim()}
              </p>
            )}
          </div>

          {/* Achieved badge */}
          {achieved && (
            <Badge
              variant="outline"
              className="flex-shrink-0 border-emerald-500/50 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-200"
            >
              <PartyPopper className="mr-1 h-2.5 w-2.5" aria-hidden />
              Done
            </Badge>
          )}

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Goal actions"
                disabled={deletingId === g.id}
                onClick={(e) => e.stopPropagation()}
              >
                {deletingId === g.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] w-48">
              {!achieved ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => void handleMarkAchievedNow(g)}
                >
                  <PartyPopper className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Mark as Achieved
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => void handleUnmarkAchieved(g)}
                >
                  <CircleOff className="text-muted-foreground" aria-hidden />
                  Undo Mark Achieved
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                disabled={deletingId === g.id}
                onSelect={() => {
                  if (!confirm("Delete this goal?")) return;
                  void handleDeleteGoal(g.id);
                }}
              >
                <Trash2 className="text-destructive" aria-hidden />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    );
  };

  if (loading || !user) {
    return <DashboardSkeleton variant="my-goals" />;
  }

  if (goalsQuery.isPending) {
    return <DashboardSkeleton variant="my-goals" />;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10 pt-4">
      <ContentHeader
        title="Goals"
        subtitle="Track what you&#39;re working toward — we&#39;ll celebrate with you."
        icon={Target}
        className="mb-4"
      />

      {fetchErr ? (
        <p className="text-sm text-destructive">{fetchErr}</p>
      ) : (
        <>
          {goals.length > 0 ? (
            <div className="mb-2">
              <div className="mb-4 flex flex-row items-start justify-between gap-3 sm:gap-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="inline-flex min-h-5 items-center gap-2.5">
                      <Label
                        id="goals-categorized-label"
                        htmlFor="goals-categorized"
                        className="mb-0 cursor-pointer select-none text-sm font-medium leading-none text-muted-foreground"
                      >
                        Categorized
                      </Label>
                      <ToggleSwitch
                        id="goals-categorized"
                        aria-labelledby="goals-categorized-label"
                        checked={goalsCategorized}
                        className="shrink-0"
                        onCheckedChange={setGoalsCategorizedPersisted}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {listGoals.length} item{listGoals.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-row items-center justify-end gap-2 pt-0.5">
                  <StatusFilterDropdown
                    open={filterMenuOpen}
                    onOpenChange={setFilterMenuOpen}
                    menuLabel="Status"
                    activeFilterCount={activeFilterCount}
                    options={[
                      {
                        label: "Achieved",
                        checked: draftFilterAchieved,
                        onToggle: () => setDraftFilterAchieved((prev) => !prev),
                      },
                      {
                        label: "Not Yet Achieved",
                        checked: draftFilterNotYet,
                        onToggle: () => setDraftFilterNotYet((prev) => !prev),
                      },
                    ]}
                    onReset={() => {
                      setDraftFilterAchieved(false);
                      setDraftFilterNotYet(false);
                      setFilterAchieved(false);
                      setFilterNotYet(false);
                      setFilterMenuOpen(false);
                    }}
                    onApply={() => {
                      setFilterAchieved(draftFilterAchieved);
                      setFilterNotYet(draftFilterNotYet);
                      setFilterMenuOpen(false);
                    }}
                  />
                  <Button type="button" className="shrink-0 gap-2 whitespace-nowrap" onClick={openAdd}>
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Goal</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {goals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-sm text-muted-foreground">
                <p>
                  No goals yet. Tap <span className="font-medium text-foreground">Add Goal</span> to create your first one.
                </p>
                <Button type="button" size="sm" className="gap-1.5" onClick={openAdd}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Goal
                </Button>
              </CardContent>
            </Card>
          ) : listGoals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No goals match your selected filters right now.
              </CardContent>
            </Card>
          ) : goalsCategorized ? (
            <div className="space-y-8">
              {goalGroups.map(({ type, label, goals: groupGoals }) =>
                groupGoals.length === 0 ? null : (
                  <section key={type} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{label} Goals</h3>
                      <span className="text-xs text-muted-foreground">
                        {groupGoals.length} goal{groupGoals.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="space-y-4">{groupGoals.map((g) => renderGoalListItem(g))}</ul>
                    <hr className="border-border/60" />
                  </section>
                )
              )}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGoalDragEnd}>
              <SortableContext items={orderedGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-4">
                  {orderedGoals.map((g) => (
                    <SortableGoalWrapper key={g.id} id={g.id}>
                      {(sortable) => renderGoalListItem(g, sortable)}
                    </SortableGoalWrapper>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto"
          showClose
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Goal" : "Add Goal"}</DialogTitle>
            <DialogDescription className="hidden sm:block">
              Name what you’re aiming for, when you started, and optionally when you completed it—short-term,
              long-term, or lifetime.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="goal-name">
                  Goal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="goal-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="goal-type">
                  Goal Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.goal_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, goal_type: v as GoalType }))}
                >
                  <SelectTrigger id="goal-type" className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <fieldset className="space-y-2 border-0 p-0">
              <legend className="mb-2 text-sm font-medium leading-none">
                Date set <span className="text-destructive">*</span>
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={form.set_month}
                  onValueChange={(v) => setForm((f) => ({ ...f, set_month: v }))}
                >
                  <SelectTrigger id="goal-date-set-month" className="h-9 w-full" aria-label="Date set, month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.set_year}
                  onValueChange={(v) => setForm((f) => ({ ...f, set_year: v }))}
                >
                  <SelectTrigger id="goal-date-set-year" className="h-9 w-full" aria-label="Date set, year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            <fieldset className="space-y-2 border-0 p-0">
              <legend className="mb-2 text-sm font-medium leading-none">Date achieved</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={form.achieved_month}
                  onValueChange={(v) => setForm((f) => ({ ...f, achieved_month: v }))}
                >
                  <SelectTrigger id="goal-achieved-month" className="h-9 w-full" aria-label="Date achieved, month">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={ACHIEVED_NONE}>Not set</SelectItem>
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.achieved_year}
                  onValueChange={(v) => setForm((f) => ({ ...f, achieved_year: v }))}
                >
                  <SelectTrigger id="goal-achieved-year" className="h-9 w-full" aria-label="Date achieved, year">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={ACHIEVED_NONE}>Not set</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              For Date achieved, pick both month and year together, or leave both as Not set.
            </p>
            <div className="space-y-2">
              <Label htmlFor="goal-notes">Notes</Label>
              <textarea
                id="goal-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Add notes e.g. Reasons, Motivations, Steps to achieve it"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <DialogFooter className="pt-2">
              <div className="flex w-full items-center gap-2">
                {editingId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
                    aria-label="Remove"
                    disabled={saving || deletingId !== null}
                    onClick={() => {
                      if (!confirm("Delete this goal?")) return;
                      void handleDeleteGoal(editingId);
                    }}
                  >
                    {deletingId === editingId ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex flex-1 gap-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-1/2" disabled={saving}>
                    {saving ? "Saving…" : editingId ? "Save" : "Add Goal"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
