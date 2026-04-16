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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { goalsQueryOptions } from "@/lib/query/my-goals";
import {
  readGoalsCategorizedPreference,
  writeGoalsCategorizedPreference,
} from "@/lib/goals-categorized-preference";
import { goalInputSchema } from "@/lib/validation/forms";
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
  Check,
  Loader2,
  CircleOff,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
  PartyPopper,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

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

/** Right-side goal art (celebration or target): same layout as CSS background layers. */
const GOAL_CARD_ART_STRIP =
  "pointer-events-none absolute inset-y-0 right-0 z-0 w-[min(46%,14rem)] min-w-[7.5rem] max-w-[15rem] bg-contain bg-right-bottom bg-no-repeat sm:w-[min(44%,16rem)] sm:max-w-[17rem]";

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
  const [inlineNameEditId, setInlineNameEditId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const skipInlineNameBlurCommitRef = useRef(false);

  const [goalsCategorized, setGoalsCategorized] = useState(false);
  const [filterAchieved, setFilterAchieved] = useState(false);
  const [filterNotYet, setFilterNotYet] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [draftFilterAchieved, setDraftFilterAchieved] = useState(false);
  const [draftFilterNotYet, setDraftFilterNotYet] = useState(false);

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

  const activeFilterCount = Number(filterAchieved) + Number(filterNotYet);

  const invalidateGoals = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
  }, [queryClient]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const commitInlineNameEdit = useCallback(
    async (goalId: string) => {
      if (inlineNameEditId !== goalId) return;
      const list = goalsQuery.data ?? [];
      const g = list.find((x) => x.id === goalId);
      if (!g) {
        setInlineNameEditId(null);
        setInlineNameDraft("");
        return;
      }
      const next = inlineNameDraft.trim();
      if (next === g.name.trim()) {
        setInlineNameEditId(null);
        setInlineNameDraft("");
        return;
      }
      const parsed = goalInputSchema.safeParse({ ...goalRowToInput(g), name: next });
      if (!parsed.success) {
        showError(parsed.error.issues[0]?.message ?? "Invalid goal details.");
        setInlineNameDraft(g.name);
        return;
      }
      const res = await updateGoal(goalId, parsed.data);
      if (res.error) {
        showError(res.error);
        return;
      }
      invalidateGoals();
      setInlineNameEditId(null);
      setInlineNameDraft("");
    },
    [inlineNameEditId, inlineNameDraft, goalsQuery.data, showError, invalidateGoals]
  );

  const beginInlineNameEdit = useCallback(
    async (g: GoalEntryRow) => {
      if (dialogOpen) {
        setDialogOpen(false);
        setEditingId(null);
        setForm(emptyForm());
      }
      if (inlineNameEditId === g.id) {
        await commitInlineNameEdit(g.id);
        return;
      }
      if (inlineNameEditId) await commitInlineNameEdit(inlineNameEditId);
      setInlineNameEditId(g.id);
      setInlineNameDraft(g.name);
    },
    [dialogOpen, inlineNameEditId, commitInlineNameEdit]
  );

  const openAdd = async () => {
    if (inlineNameEditId) await commitInlineNameEdit(inlineNameEditId);
    setInlineNameEditId(null);
    setInlineNameDraft("");
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (g: GoalEntryRow) => {
    if (inlineNameEditId) await commitInlineNameEdit(inlineNameEditId);
    setInlineNameEditId(null);
    setInlineNameDraft("");
    setEditingId(g.id);
    setForm(rowToForm(g));
    setDialogOpen(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = formToPayload(form);
    const parsed = goalInputSchema.safeParse(payload);
    if (!parsed.success) {
      showError(parsed.error.issues[0]?.message ?? "Invalid goal details.");
      return;
    }
    setSaving(true);
    try {
      const res = editingId ? await updateGoal(editingId, parsed.data) : await createGoal(parsed.data);
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
    if (inlineNameEditId === id) {
      setInlineNameEditId(null);
      setInlineNameDraft("");
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

  const renderGoalListItem = (g: GoalEntryRow) => {
    const achieved = isGoalAchieved(g);
    const typeLabel =
      GOAL_TYPES.find((t) => t.value === g.goal_type)?.label ?? g.goal_type;
    const achievedShort =
      achieved && g.date_achieved_month != null && g.date_achieved_year != null
        ? formatMonthYearShort(g.date_achieved_month, g.date_achieved_year)
        : null;
    return (
      <li key={g.id}>
        <Card
          className={cn(
            "relative flex min-h-0 items-stretch overflow-hidden transition-shadow",
            achieved &&
              "border-emerald-400/50 bg-gradient-to-br from-emerald-400/15 via-background to-background shadow-md shadow-emerald-500/10 dark:border-emerald-400/70 dark:bg-gradient-to-br dark:from-emerald-500/45 dark:via-emerald-900/75 dark:to-emerald-950/55 dark:shadow-xl dark:shadow-emerald-500/40 dark:ring-2 dark:ring-emerald-400/45"
          )}
        >
          <div
            className={cn(
              GOAL_CARD_ART_STRIP,
              achieved
                ? "bg-[url('/images/goals/celebration.png')]"
                : "bg-[url('/images/goals/target.png')]"
            )}
            aria-hidden
          />
          <div
            className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 py-3 pl-3 pr-[min(46%,14rem)] sm:gap-2 sm:py-3.5 sm:pl-4 sm:pr-[min(44%,16rem)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {inlineNameEditId === g.id ? (
                <Input
                  value={inlineNameDraft}
                  onChange={(e) => setInlineNameDraft(e.target.value)}
                  className="h-8 max-w-[min(100%,20rem)] text-lg font-semibold"
                  placeholder="Goal name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitInlineNameEdit(g.id);
                    }
                    if (e.key === "Escape") {
                      skipInlineNameBlurCommitRef.current = true;
                      setInlineNameEditId(null);
                      setInlineNameDraft("");
                    }
                  }}
                  onBlur={() => {
                    if (skipInlineNameBlurCommitRef.current) {
                      skipInlineNameBlurCommitRef.current = false;
                      return;
                    }
                    void commitInlineNameEdit(g.id);
                  }}
                  aria-label="Goal name"
                />
              ) : (
                <button
                  type="button"
                  className="min-w-0 truncate text-left text-lg font-semibold leading-tight tracking-tight underline-offset-2 hover:underline"
                  onClick={() => void beginInlineNameEdit(g)}
                >
                  {g.name}
                </button>
              )}
              <Badge
                variant="outline"
                className={cn("shrink-0 font-medium", goalTypeBadgeClass(g.goal_type))}
              >
                {typeLabel}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Goal actions"
                    disabled={deletingId === g.id}
                    onPointerDown={(e) => {
                      if (inlineNameEditId === g.id) e.preventDefault();
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[100] min-w-0 w-52">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      void openEdit(g);
                    }}
                  >
                    <Pencil className="text-muted-foreground" aria-hidden />
                    Edit
                  </DropdownMenuItem>
                  {!achieved ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => {
                        void handleMarkAchievedNow(g);
                      }}
                    >
                      <PartyPopper className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                      Mark as Achieved
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => {
                        void handleUnmarkAchieved(g);
                      }}
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
                    {deletingId === g.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="text-destructive" aria-hidden />
                    )}
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground">Date set: </span>
              {formatMonthYearShort(g.date_set_month, g.date_set_year)}
              {achieved && achievedShort ? (
                <>
                  <span aria-hidden className="px-1.5">
                    •
                  </span>
                  <span className="text-muted-foreground">Date achieved: </span>
                  {achievedShort}
                </>
              ) : null}
            </p>
            {g.notes?.trim() ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{g.notes.trim()}</p>
              </div>
            ) : null}
          </div>
        </Card>
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
        title="My Goals"
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
                  <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="gap-2">
                        <ListFilter className="h-4 w-4" aria-hidden />
                        <span className="hidden sm:inline">Filter</span>
                        {activeFilterCount > 0 ? (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                            {activeFilterCount}
                          </Badge>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDraftFilterAchieved((prev) => !prev);
                        }}
                      >
                        <span
                          className={cn(
                            "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                            draftFilterAchieved &&
                              "border-primary bg-primary text-primary-foreground"
                          )}
                          aria-hidden
                        >
                          {draftFilterAchieved ? <Check className="h-3 w-3" /> : null}
                        </span>
                        Achieved
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDraftFilterNotYet((prev) => !prev);
                        }}
                      >
                        <span
                          className={cn(
                            "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                            draftFilterNotYet &&
                              "border-primary bg-primary text-primary-foreground"
                          )}
                          aria-hidden
                        >
                          {draftFilterNotYet ? <Check className="h-3 w-3" /> : null}
                        </span>
                        Not Yet Achieved
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="flex items-center justify-end gap-2 p-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraftFilterAchieved(false);
                            setDraftFilterNotYet(false);
                            setFilterAchieved(false);
                            setFilterNotYet(false);
                            setFilterMenuOpen(false);
                          }}
                        >
                          Reset
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setFilterAchieved(draftFilterAchieved);
                            setFilterNotYet(draftFilterNotYet);
                            setFilterMenuOpen(false);
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    <ul className="space-y-4">{groupGoals.map(renderGoalListItem)}</ul>
                    <hr className="border-border/60" />
                  </section>
                )
              )}
            </div>
          ) : (
            <ul className="space-y-4">{listGoals.map(renderGoalListItem)}</ul>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-md overflow-y-auto" showClose>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Goal" : "Add Goal"}</DialogTitle>
            <DialogDescription>
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
            <DialogFooter className="gap-2 pt-2 sm:justify-end">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mr-auto border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={saving || deletingId !== null}
                  aria-label="Delete goal"
                  onClick={() => {
                    if (!editingId) return;
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
              ) : null}
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Save"
                ) : (
                  "Add Goal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
