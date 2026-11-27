"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ContentHeader } from "@/components/app/content-header";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { OttoAnimated } from "@/components/mascot/otto";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { GoalsOverviewPanel } from "@/components/dashboard/goals/goals-overview-panel";
import { GoalCard } from "@/components/dashboard/goals/goal-card";
import { GoalDetailPanel } from "@/components/dashboard/goals/goal-detail-panel";
import { GoalDepositPanel, type GoalDepositInput } from "@/components/dashboard/goals/goal-deposit-panel";
import {
  GoalFormPanel,
  emptyGoalForm,
  formToGoalInput,
  goalRowToInput,
  goalToForm,
  type GoalFormState,
} from "@/components/dashboard/goals/goal-form-panel";
import { useUser } from "@/hooks/use-user";
import { useLocalClock } from "@/hooks/use-local-clock";
import { goalsQueryOptions } from "@/lib/query/my-goals";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { queryKeys } from "@/lib/query/keys";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { GOAL_VIEWS, type GoalView } from "@/lib/constants/goals";
import { MASCOT_NAME } from "@/lib/constants/mascot";
import { cn, formatCurrency } from "@/lib/utils";
import {
  buildGoalSections,
  depositDateLabel,
  goalMonthLabel,
  matchesGoalView,
  summariseGoal,
  summariseGoals,
} from "@/lib/goals/progress";
import {
  addGoalDeposit,
  createGoal,
  deleteGoal,
  deleteGoalDeposit,
  updateGoal,
  type GoalDepositRow,
  type GoalEntryRow,
} from "@/actions/goals";

type ConfirmRequest =
  | { kind: "delete-goal"; goal: GoalEntryRow }
  | { kind: "unreach"; goal: GoalEntryRow }
  | { kind: "delete-deposit"; goal: GoalEntryRow; deposit: GoalDepositRow };

type FormRequest = { mode: "add" | "edit"; goalId: string | null; initial: GoalFormState; key: number };

function confirmCopy(req: ConfirmRequest, currency: string) {
  if (req.kind === "delete-goal") {
    const { goal } = req;
    return {
      title: `Delete “${goal.name}”?`,
      description:
        goal.deposit_count > 0
          ? `The goal and the ${goal.deposit_count} ${goal.deposit_count === 1 ? "deposit" : "deposits"} on it (${formatCurrency(goal.total_deposited, currency)}) will be deleted. This can't be undone.`
          : "This can't be undone.",
      confirmLabel: "Delete goal",
      variant: "destructive" as const,
    };
  }
  if (req.kind === "unreach") {
    const { goal } = req;
    const when =
      goal.date_achieved_month != null && goal.date_achieved_year != null
        ? ` (${goalMonthLabel(goal.date_achieved_month, goal.date_achieved_year)})`
        : "";
    return {
      title: `Mark “${goal.name}” as not reached?`,
      description: `It moves back to In progress, and the month you reached it${when} is cleared.`,
      confirmLabel: "Not reached yet",
      variant: "default" as const,
    };
  }
  return {
    title: "Remove this deposit?",
    description: `${formatCurrency(req.deposit.amount, currency)} added on ${depositDateLabel(req.deposit.deposited_at)} will come off ${req.goal.name}.`,
    confirmLabel: "Remove",
    variant: "destructive" as const,
  };
}

export function GoalsBoard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useSnackbar();
  const todayYmd = useLocalClock()?.todayYmd ?? null;

  const { data: goals } = useSuspenseQuery(goalsQueryOptions());
  // useQuery: keyed by the signed-in user's id from context, which the server page
  // can't prefetch; the default currency is a fine first paint, as on Expenses and Bills.
  const prefsQuery = useQuery(userPreferencesQueryOptions(user?.id));
  const currency = prefsQuery.data?.currency ?? DEFAULT_USER_PREFERENCES.currency;

  // ── Derived model ──────────────────────────────────────────────────────────
  const progressList = useMemo(() => goals.map((g) => summariseGoal(g, todayYmd)), [goals, todayYmd]);
  const progressById = useMemo(() => new Map(progressList.map((p) => [p.goal.id, p])), [progressList]);
  const overview = useMemo(() => summariseGoals(progressList, todayYmd), [progressList, todayYmd]);

  // Goals marked reached during this visit stay on the In progress list, stamped,
  // with an Undo, instead of vanishing from under the tap.
  const [justReachedIds, setJustReachedIds] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<GoalView>("active");
  // The switch only earns its place once there are goals of both kinds.
  const showViews = overview.activeCount > 0 && overview.reachedCount > 0;
  const effectiveView: GoalView = showViews ? view : "all";
  const viewCounts: Record<GoalView, number> = {
    active: overview.activeCount,
    reached: overview.reachedCount,
    all: progressList.length,
  };

  const sections = useMemo(
    () =>
      buildGoalSections(
        progressList.filter(
          (p) => matchesGoalView(p, effectiveView) || (effectiveView === "active" && justReachedIds.has(p.goal.id)),
        ),
      ),
    [progressList, effectiveView, justReachedIds],
  );

  // ── Panels ─────────────────────────────────────────────────────────────────
  // Each panel keeps its last subject after closing, so it slides away with its
  // content instead of going blank mid-animation.
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formRequest, setFormRequest] = useState<FormRequest | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositKey, setDepositKey] = useState(0);
  const [depositPending, setDepositPending] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);
  const [deletingDepositId, setDeletingDepositId] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const invalidateGoals = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals() });
  }, [queryClient]);

  function askConfirm(req: ConfirmRequest) {
    setConfirmRequest(req);
    setConfirmOpen(true);
  }

  function openDetail(goalId: string) {
    setDetailId(goalId);
    setDetailOpen(true);
  }

  function openAdd() {
    setFormError(null);
    const initial = emptyGoalForm();
    setFormRequest((prev) => ({ mode: "add", goalId: null, initial, key: (prev?.key ?? 0) + 1 }));
    setFormOpen(true);
  }

  function openEdit(goal: GoalEntryRow) {
    setFormError(null);
    const initial = goalToForm(goal);
    setFormRequest((prev) => ({ mode: "edit", goalId: goal.id, initial, key: (prev?.key ?? 0) + 1 }));
    setFormOpen(true);
  }

  function openDeposit(goalId: string) {
    setDepositError(null);
    setDepositGoalId(goalId);
    setDepositKey((k) => k + 1);
    setDepositOpen(true);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function saveGoal(form: GoalFormState) {
    if (!formRequest) return;
    setFormPending(true);
    setFormError(null);
    const input = formToGoalInput(form);
    const res =
      formRequest.mode === "edit" && formRequest.goalId
        ? await updateGoal(formRequest.goalId, input)
        : await createGoal(input);
    setFormPending(false);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    setFormOpen(false);
    invalidateGoals();
  }

  /** Marks a goal reached this month, or clears its reached date, optimistically. */
  async function setReached(goal: GoalEntryRow, reached: boolean) {
    const now = new Date();
    const month = reached ? now.getMonth() + 1 : null;
    const year = reached ? now.getFullYear() : null;
    const key = queryKeys.goals();
    const previous = queryClient.getQueryData<GoalEntryRow[]>(key);
    const toggleJustReached = (on: boolean) =>
      setJustReachedIds((ids) => {
        const next = new Set(ids);
        if (on) next.add(goal.id);
        else next.delete(goal.id);
        return next;
      });

    queryClient.setQueryData<GoalEntryRow[]>(key, (old) =>
      (old ?? []).map((row) =>
        row.id === goal.id ? { ...row, date_achieved_month: month, date_achieved_year: year } : row,
      ),
    );
    toggleJustReached(reached);
    setBusyGoalId(goal.id);
    const res = await updateGoal(goal.id, {
      ...goalRowToInput(goal),
      date_achieved_month: month,
      date_achieved_year: year,
    });
    setBusyGoalId(null);
    if (res.error) {
      queryClient.setQueryData(key, previous);
      toggleJustReached(!reached);
      showError(res.error);
      return;
    }
    if (reached) showSuccess(`${goal.name} reached. Well done!`);
    invalidateGoals();
  }

  async function removeGoal(goal: GoalEntryRow) {
    setBusyGoalId(goal.id);
    const res = await deleteGoal(goal.id);
    setBusyGoalId(null);
    if (res.error) {
      showError(res.error);
      return;
    }
    if (detailId === goal.id) setDetailOpen(false);
    queryClient.removeQueries({ queryKey: queryKeys.goalDeposits(goal.id) });
    invalidateGoals();
  }

  async function saveDeposit(input: GoalDepositInput) {
    if (!depositGoalId) return;
    const before = progressById.get(depositGoalId);
    setDepositPending(true);
    setDepositError(null);
    const res = await addGoalDeposit(depositGoalId, input);
    setDepositPending(false);
    if (res.error) {
      setDepositError(res.error);
      return;
    }
    setDepositOpen(false);
    invalidateGoals();
    void queryClient.invalidateQueries({ queryKey: queryKeys.goalDeposits(depositGoalId) });
    if (before && !before.isReached && before.remaining !== null && before.remaining > 0 && input.amount >= before.remaining) {
      showSuccess(`That's the whole target for ${before.goal.name}! Mark it reached when you're ready.`);
    }
  }

  async function removeDeposit(goal: GoalEntryRow, deposit: GoalDepositRow) {
    setDeletingDepositId(deposit.id);
    const res = await deleteGoalDeposit(deposit.id);
    setDeletingDepositId(null);
    if (res.error) {
      showError(res.error);
      return;
    }
    invalidateGoals();
    void queryClient.invalidateQueries({ queryKey: queryKeys.goalDeposits(goal.id) });
  }

  function handleConfirm() {
    if (!confirmRequest) return;
    if (confirmRequest.kind === "delete-goal") void removeGoal(confirmRequest.goal);
    else if (confirmRequest.kind === "unreach") void setReached(confirmRequest.goal, false);
    else void removeDeposit(confirmRequest.goal, confirmRequest.deposit);
  }

  const detailProgress = detailId ? progressById.get(detailId) : undefined;
  const depositProgress = depositGoalId ? progressById.get(depositGoalId) : undefined;
  const confirmText = confirmRequest ? confirmCopy(confirmRequest, currency) : null;

  return (
    <div className="container mx-auto max-w-5xl space-y-4 px-4 py-6">
      <ContentHeader
        title="Goals"
        subtitle="What you're saving for, and how close you are."
        icon={Target}
        actions={
          <Button size={CONTENT_HEADER_ACTION_SIZE.button} className="gap-1.5" onClick={openAdd}>
            <Plus className="size-4" aria-hidden />
            Add goal
          </Button>
        }
      />

      {progressList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <OttoAnimated pose="think" size={150} />
          <p className="text-base font-semibold text-foreground">No goals yet</p>
          <p className="max-w-[40ch] text-sm">
            {`Name something you’re saving for, like a trip or an emergency fund, and add money to it as you go. ${MASCOT_NAME} will show you how close you are and when you’ll get there.`}
          </p>
          <Button size="lg" className="mt-3 gap-1.5" onClick={openAdd}>
            <Plus className="size-4" aria-hidden />
            Add your first goal
          </Button>
        </div>
      ) : (
        <>
          <GoalsOverviewPanel overview={overview} currency={currency} currentYm={todayYmd?.slice(0, 7) ?? null} />

          {showViews && (
            <div
              role="group"
              aria-label="Show goals"
              className="flex w-full gap-0.5 rounded-[10px] bg-muted p-[3px] sm:inline-flex sm:w-auto"
            >
              {GOAL_VIEWS.map(({ id, label }) => {
                const active = effectiveView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(id)}
                    className={cn(
                      "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors sm:flex-none",
                      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                    <span className="font-mono text-[11px] opacity-70">{viewCounts[id]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-6 pt-1">
            {sections.map((section) => (
              <section key={section.type} aria-labelledby={`goals-${section.type}`}>
                <div className="flex items-baseline px-0.5 pb-2">
                  <h2
                    id={`goals-${section.type}`}
                    className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {section.label} <span aria-hidden>•</span> {section.items.length}
                  </h2>
                  <DotLeader />
                  <span className="whitespace-nowrap pb-px text-[12px] text-muted-foreground">
                    {section.remaining > 0 ? (
                      <>
                        <Amount value={section.remaining} currency={currency} className="text-foreground" /> to go
                      </>
                    ) : (
                      <>
                        <Amount value={section.saved} currency={currency} className="text-foreground" /> saved
                      </>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {section.items.map((p) => (
                    <GoalCard
                      key={p.goal.id}
                      progress={p}
                      currency={currency}
                      todayYmd={todayYmd}
                      justReached={justReachedIds.has(p.goal.id)}
                      busy={busyGoalId === p.goal.id}
                      onOpen={() => openDetail(p.goal.id)}
                      onAddMoney={() => openDeposit(p.goal.id)}
                      onEdit={() => openEdit(p.goal)}
                      onMarkReached={() => void setReached(p.goal, true)}
                      onUnmarkReached={() => askConfirm({ kind: "unreach", goal: p.goal })}
                      onUndoReached={() => void setReached(p.goal, false)}
                      onDelete={() => askConfirm({ kind: "delete-goal", goal: p.goal })}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {detailProgress && (
        <GoalDetailPanel
          open={detailOpen}
          progress={detailProgress}
          currency={currency}
          todayYmd={todayYmd}
          busy={busyGoalId === detailProgress.goal.id}
          deletingDepositId={deletingDepositId}
          onClose={() => setDetailOpen(false)}
          onAddMoney={() => openDeposit(detailProgress.goal.id)}
          onEdit={() => openEdit(detailProgress.goal)}
          onMarkReached={() => void setReached(detailProgress.goal, true)}
          onUnmarkReached={() => askConfirm({ kind: "unreach", goal: detailProgress.goal })}
          onDelete={() => askConfirm({ kind: "delete-goal", goal: detailProgress.goal })}
          onDeleteDeposit={(deposit) => askConfirm({ kind: "delete-deposit", goal: detailProgress.goal, deposit })}
        />
      )}

      {formRequest && (
        <GoalFormPanel
          key={formRequest.key}
          open={formOpen}
          mode={formRequest.mode}
          initial={formRequest.initial}
          isPending={formPending}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSave={(form) => void saveGoal(form)}
        />
      )}

      {depositProgress && (
        <GoalDepositPanel
          key={depositKey}
          open={depositOpen}
          goalName={depositProgress.goal.name}
          remaining={depositProgress.isReached ? null : depositProgress.remaining}
          currency={currency}
          isPending={depositPending}
          error={depositError}
          onClose={() => setDepositOpen(false)}
          onSave={(input) => void saveDeposit(input)}
        />
      )}

      {confirmText && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmText.title}
          description={confirmText.description}
          confirmLabel={confirmText.confirmLabel}
          variant={confirmText.variant}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
