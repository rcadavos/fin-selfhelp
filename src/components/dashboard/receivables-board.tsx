"use client";

import { useState, useMemo, useTransition } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  HandCoins,
  Plus,
  Trash2,
  Link2,
  MailCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { ContentHeader } from "@/components/app/content-header";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { useUser } from "@/hooks/use-user";
import { receivablesQueryOptions, pendingReceivableLinksQueryOptions } from "@/lib/query/receivables";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency, cn } from "@/lib/utils";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  addReceivable,
  updateReceivable,
  deleteReceivable,
  markReceivableFullyPaid,
  markReceivableUnpaid,
  inviteDebtorToReceivable,
  cancelReceivableLink,
  type ReceivableRow,
  type ReceivableLinkRow,
  type ReceivableCategory,
} from "@/actions/receivables";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ReceivableCategory; label: string }[] = [
  { value: "loan",      label: "Cash Loan" },
  { value: "bill",      label: "Shared Bill" },
  { value: "food",      label: "Food & Drinks" },
  { value: "transport", label: "Transport" },
  { value: "services",  label: "Services" },
  { value: "other",     label: "Other" },
];

function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function getStatus(row: ReceivableRow): "paid" | "partial" | "unpaid" {
  if (row.paid_amount >= row.amount) return "paid";
  if (row.paid_amount > 0) return "partial";
  return "unpaid";
}

function getRemainingAmount(row: ReceivableRow): number {
  return Math.max(0, row.amount - row.paid_amount);
}

// ─── Form state ───────────────────────────────────────────────────────────────

type ReceivableForm = {
  debtorName: string;
  amount: string;
  paidAmount: string;
  description: string;
  category: ReceivableCategory;
  borrowedDate: string;
  dueDate: string;
  notes: string;
};

const EMPTY_FORM: ReceivableForm = {
  debtorName:   "",
  amount:       "",
  paidAmount:   "0",
  description:  "",
  category:     "loan",
  borrowedDate: "",
  dueDate:      "",
  notes:        "",
};

function rowToForm(row: ReceivableRow): ReceivableForm {
  return {
    debtorName:   row.debtor_name,
    amount:       String(row.amount),
    paidAmount:   String(row.paid_amount),
    description:  row.description,
    category:     row.category,
    borrowedDate: row.borrowed_date ?? "",
    dueDate:      row.due_date ?? "",
    notes:        row.notes ?? "",
  };
}

// ─── Link status badge ────────────────────────────────────────────────────────

function LinkStatusBadge({ status, email }: { status: string; email: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
        <Clock className="h-3 w-3 shrink-0" />
        Awaiting confirmation from <strong className="ml-0.5">{email}</strong>
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        Confirmed by <strong className="ml-0.5">{email}</strong>
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <XCircle className="h-3 w-3 shrink-0" />
        Declined by <strong className="ml-0.5">{email}</strong>
      </span>
    );
  }
  return null;
}

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

function ReceivableDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  editingId,
  isPending,
  link,
  onInvite,
  onCancelInvite,
  userEmail,
  inviteFeedback,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: ReceivableForm) => void;
  onDelete?: () => void;
  initial?: ReceivableForm;
  editingId?: string;
  isPending: boolean;
  link?: ReceivableLinkRow;
  onInvite?: (email: string, notes: string) => void;
  onCancelInvite?: () => void;
  userEmail?: string;
  inviteFeedback?: { kind: "success" | "error"; message: string } | null;
}) {
  const [form, setForm] = useState<ReceivableForm>(initial ?? EMPTY_FORM);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [showLinkSection, setShowLinkSection] = useState(false);

  // Reset on open
  useState(() => {
    if (open) {
      setForm(initial ?? EMPTY_FORM);
      setInviteEmail("");
      setInviteNote("");
      setShowLinkSection(false);
    }
  });

  function set<K extends keyof ReceivableForm>(key: K, val: ReceivableForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  const amountNum = parseFloat(form.amount);
  const paidNum   = parseFloat(form.paidAmount) || 0;
  const isValid   = form.debtorName.trim() && form.description.trim()
    && !isNaN(amountNum) && amountNum > 0;
  const inviteEmailValid = inviteEmail.trim().includes("@") && inviteEmail.trim() !== (userEmail ?? "");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{editingId ? "Edit Receivable" : "Add Receivable"}</DialogTitle>
          {editingId && initial && (
            <p className="text-xs text-muted-foreground">{initial.debtorName} · {formatCurrency(parseFloat(initial.amount) || 0)}</p>
          )}
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); if (isValid) onSave(form); }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ScrollFadeBody className="space-y-4 px-6 pb-4">

            {/* Debtor name */}
            <div className="grid gap-1.5">
              <Label htmlFor="rec-debtor">Who owes you?</Label>
              <Input
                id="rec-debtor"
                placeholder="e.g. John, Maria"
                value={form.debtorName}
                onChange={(e) => set("debtorName", e.target.value)}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label htmlFor="rec-desc">What for?</Label>
              <Input
                id="rec-desc"
                placeholder="e.g. Borrowed cash, Shared dinner bill"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Category + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v as ReceivableCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
            </div>

            {/* Amount paid back (only when editing) */}
            {editingId && (
              <div className="grid gap-1.5">
                <Label>Amount paid back</Label>
                <Input
                  type="number"
                  min="0"
                  max={form.amount}
                  step="0.01"
                  placeholder="0.00"
                  value={form.paidAmount}
                  onChange={(e) => set("paidAmount", e.target.value)}
                />
                {amountNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Remaining: {formatCurrency(Math.max(0, amountNum - paidNum))}
                  </p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Date lent <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <DatePicker value={form.borrowedDate} onChange={(ymd) => set("borrowedDate", ymd)} placeholder="Not set" />
              </div>
              <div className="grid gap-1.5">
                <Label>Due date <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <DatePicker value={form.dueDate} onChange={(ymd) => set("dueDate", ymd)} placeholder="Not set" />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="Any additional details"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {/* ── Link to another OmniTrak account ── */}
            {editingId && (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm font-medium text-primary/80"
                  onClick={() => setShowLinkSection((v) => !v)}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" />
                    Link to debtor's OmniTrak account
                  </span>
                  {showLinkSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showLinkSection && (
                  link ? (
                    <div className="space-y-2">
                      <LinkStatusBadge status={link.status} email={link.debtor_email} />
                      {link.status === "pending" && onCancelInvite && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={onCancelInvite}
                          disabled={isPending}
                        >
                          Cancel invitation
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Send an email invite so the debtor can confirm this debt on their own OmniTrak account.
                      </p>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Debtor's email</Label>
                        <Input
                          type="email"
                          placeholder="their@email.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Note to debtor <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Input
                          placeholder="e.g. The ₱500 from last Tuesday"
                          value={inviteNote}
                          onChange={(e) => setInviteNote(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={!inviteEmailValid || isPending}
                        onClick={() => onInvite?.(inviteEmail.trim(), inviteNote.trim())}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send invitation
                      </Button>
                    </div>
                  )
                )}

                {inviteFeedback && (
                  <p className={cn(
                    "text-xs",
                    inviteFeedback.kind === "success"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {inviteFeedback.message}
                  </p>
                )}
              </div>
            )}

            {!editingId && (
              <p className="text-xs text-muted-foreground">
                Save first, then open the item to send an account link invitation to the debtor.
              </p>
            )}

          </ScrollFadeBody>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
            <div className="flex w-full gap-2">
              {editingId && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className={cn("flex gap-2", editingId ? "flex-1 justify-end" : "w-full")}>
                <Button type="button" variant="outline" className={editingId ? "flex-1" : "w-1/2"} onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" className={editingId ? "flex-1" : "w-1/2"} disabled={!isValid || isPending}>
                  {isPending ? "Saving…" : editingId ? "Save changes" : "Add receivable"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Receivable row card ──────────────────────────────────────────────────────

function ReceivableCard({
  item,
  currency,
  link,
  isPending,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  item: ReceivableRow;
  currency: string;
  link?: ReceivableLinkRow;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
}) {
  const status    = getStatus(item);
  const remaining = getRemainingAmount(item);
  const isOverdue = item.due_date && status !== "paid"
    ? new Date(item.due_date) < new Date(new Date().toDateString())
    : false;

  return (
    <div
      onClick={onEdit}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
        status === "paid"
          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
          : isOverdue
            ? "border-red-300 bg-red-50/60 hover:bg-red-50 dark:border-red-700/50 dark:bg-red-950/20"
            : "border-border bg-card hover:bg-muted/40"
      )}
    >
      {/* Paid toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePaid(); }}
        disabled={isPending}
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        aria-label={status === "paid" ? "Mark unpaid" : "Mark fully paid"}
        title={status === "paid" ? "Mark unpaid" : "Mark fully paid"}
      >
        {status === "paid"
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          : <Circle className={cn("h-5 w-5", isOverdue ? "text-red-500" : "")} />
        }
      </button>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn("truncate text-sm font-medium", status === "paid" && "line-through text-muted-foreground")}>
            {item.debtor_name}
          </p>

          {status === "paid" && (
            <span className="shrink-0 rounded-full border border-emerald-400/60 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Collected
            </span>
          )}
          {status === "partial" && (
            <span className="shrink-0 rounded-full border border-blue-400/60 bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Partial
            </span>
          )}
          {status === "unpaid" && isOverdue && (
            <span className="shrink-0 rounded-full border border-red-400/60 bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Overdue
            </span>
          )}

          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
            {getCategoryLabel(item.category)}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground/70">
          {item.borrowed_date && <span>Lent {item.borrowed_date}</span>}
          {item.due_date && status !== "paid" && (
            <span className={cn(isOverdue && "text-red-500 dark:text-red-400")}>
              Due {item.due_date}
            </span>
          )}
        </div>

        {link && link.status !== "cancelled" && (
          <div className="mt-1">
            <LinkStatusBadge status={link.status} email={link.debtor_email} />
          </div>
        )}
      </div>

      {/* Amount column */}
      <div className="shrink-0 text-right space-y-0.5">
        <p className={cn("text-sm font-semibold tabular-nums", status === "paid" && "text-muted-foreground line-through")}>
          {formatCurrency(item.amount, currency)}
        </p>
        {status === "partial" && (
          <p className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">
            -{formatCurrency(item.paid_amount, currency)} paid
          </p>
        )}
        {status !== "paid" && (
          <p className="text-xs font-semibold text-foreground tabular-nums">
            {formatCurrency(remaining, currency)} left
          </p>
        )}
      </div>

      {/* Delete */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 self-center text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete receivable"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Pending incoming link banner ─────────────────────────────────────────────

function PendingLinkBanner({
  description,
  ownerName,
  amount,
  currency,
  token,
}: {
  description: string;
  ownerName: string;
  amount: number;
  currency: string;
  token: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3">
      <MailCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          <strong>{ownerName}</strong> says you owe them{" "}
          <strong>{formatCurrency(amount, currency)}</strong>
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">{description}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 text-xs"
        asChild
      >
        <a href={`/dashboard/receivables/invite/${token}`}>Review</a>
      </Button>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

type StatusTab = "all" | "unpaid" | "partial" | "paid";

export function ReceivablesBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<StatusTab>("unpaid");
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceivableRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const receivablesQuery  = useQuery(receivablesQueryOptions());
  const pendingLinksQuery = useQuery({ ...pendingReceivableLinksQueryOptions(), enabled: !!user });
  const prefsQuery        = useQuery(userPreferencesQueryOptions(user?.id));

  const currency    = prefsQuery.data?.currency ?? DEFAULT_USER_PREFERENCES.currency;
  const items       = receivablesQuery.data?.receivables ?? [];
  const links       = receivablesQuery.data?.links ?? [];
  const pendingIncoming = (pendingLinksQuery.data?.links ?? []).filter((l) => l.status === "pending");

  const linkMap = useMemo(
    () => Object.fromEntries(links.map((l) => [l.receivable_id, l])),
    [links]
  );

  // Summary
  const { totalOwed, totalCollected, totalOutstanding } = useMemo(() => {
    const owed      = items.reduce((s, i) => s + i.amount, 0);
    const collected = items.reduce((s, i) => s + i.paid_amount, 0);
    return { totalOwed: owed, totalCollected: collected, totalOutstanding: owed - collected };
  }, [items]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all:     items.length,
    unpaid:  items.filter((i) => getStatus(i) === "unpaid").length,
    partial: items.filter((i) => getStatus(i) === "partial").length,
    paid:    items.filter((i) => getStatus(i) === "paid").length,
  }), [items]);

  const filteredItems = useMemo(() => {
    const base = activeTab === "all" ? items : items.filter((i) => getStatus(i) === activeTab);
    // Sort: overdue first, then by due date, then by created_at
    return [...base].sort((a, b) => {
      const aOverdue = a.due_date && getStatus(a) !== "paid" && new Date(a.due_date) < new Date(new Date().toDateString());
      const bOverdue = b.due_date && getStatus(b) !== "paid" && new Date(b.due_date) < new Date(new Date().toDateString());
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [items, activeTab]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.receivables() });
  }

  async function handleAdd(form: ReceivableForm) {
    startTransition(async () => {
      const res = await addReceivable({
        debtorName:   form.debtorName,
        amount:       parseFloat(form.amount) || 0,
        description:  form.description,
        category:     form.category,
        borrowedDate: form.borrowedDate || undefined,
        dueDate:      form.dueDate || undefined,
        notes:        form.notes || undefined,
      });
      if (!res.error) { setAddOpen(false); invalidate(); }
    });
  }

  async function handleEdit(form: ReceivableForm) {
    if (!editingItem) return;
    startTransition(async () => {
      const res = await updateReceivable(editingItem.id, {
        debtorName:   form.debtorName,
        amount:       parseFloat(form.amount) || 0,
        paidAmount:   parseFloat(form.paidAmount) || 0,
        description:  form.description,
        category:     form.category,
        borrowedDate: form.borrowedDate || undefined,
        dueDate:      form.dueDate || undefined,
        notes:        form.notes || undefined,
      });
      if (!res.error) { setEditingItem(null); invalidate(); }
    });
  }

  async function handleTogglePaid(item: ReceivableRow) {
    startTransition(async () => {
      if (getStatus(item) === "paid") {
        await markReceivableUnpaid(item.id);
      } else {
        await markReceivableFullyPaid(item.id);
      }
      invalidate();
    });
  }

  async function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteReceivable(deletingId);
      setDeletingId(null);
      invalidate();
    });
  }

  async function handleInvite(receivableId: string, email: string, notes: string) {
    setInviteFeedback(null);
    startTransition(async () => {
      const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Someone";
      const res = await inviteDebtorToReceivable({
        receivableId,
        debtorEmail: email,
        notes: notes || undefined,
        ownerName: displayName,
      });
      if (res.error) {
        setInviteFeedback({ kind: "error", message: res.error });
      } else if (res.deliveredVia === "in-app") {
        setInviteFeedback({ kind: "success", message: `Sent in-app notification to ${email}.` });
      } else {
        setInviteFeedback({ kind: "success", message: `Sent email invitation to ${email}.` });
      }
      invalidate();
    });
  }

  async function handleCancelLink(linkId: string) {
    setInviteFeedback(null);
    startTransition(async () => {
      await cancelReceivableLink(linkId);
      invalidate();
    });
  }

  const TABS: { value: StatusTab; label: string }[] = [
    { value: "all",     label: "All" },
    { value: "unpaid",  label: "Unpaid" },
    { value: "partial", label: "Partial" },
    { value: "paid",    label: "Collected" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <ContentHeader
        title="Receivables"
        subtitle="Track money owed to you — lent cash, shared bills, and IOUs."
        icon={HandCoins}
      />

      {/* Pending incoming confirmations (you are the debtor) */}
      {pendingIncoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending confirmations for you
          </p>
          {pendingIncoming.map((l) => (
            <PendingLinkBanner
              key={l.id}
              description={l.description}
              ownerName={l.owner_name}
              amount={l.amount}
              currency={currency}
              token={l.invite_token}
            />
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">Total Owed</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">
            <AnimatedAmount value={totalOwed} currency={currency} />
          </p>
          <p className="text-[11px] text-muted-foreground">{items.length} receivable{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">Collected</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <AnimatedAmount value={totalCollected} currency={currency} />
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">Outstanding</p>
          <p className={cn(
            "mt-0.5 text-lg font-bold tabular-nums",
            totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : ""
          )}>
            <AnimatedAmount value={totalOutstanding} currency={currency} />
          </p>
        </div>
      </div>

      {/* Tabs + list */}
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center rounded-md border bg-background p-1 sm:w-auto">
            {TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={activeTab === tab.value ? "secondary" : "ghost"}
                className="h-9 flex-1 px-2 text-sm sm:flex-none sm:px-3"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
                <Badge
                  variant={activeTab === tab.value ? "default" : "secondary"}
                  className="ml-0.5 h-5 min-w-5 px-1.5 text-[11px]"
                >
                  {tabCounts[tab.value]}
                </Badge>
              </Button>
            ))}
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="w-full gap-1.5 sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Receivable
          </Button>
        </div>

        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <HandCoins className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                {activeTab === "all" ? "No receivables yet." : `No ${activeTab} receivables.`}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ReceivableCard
                key={item.id}
                item={item}
                currency={currency}
                link={linkMap[item.id]}
                isPending={isPending}
                onEdit={() => setEditingItem(item)}
                onDelete={() => setDeletingId(item.id)}
                onTogglePaid={() => handleTogglePaid(item)}
              />
            ))
          )}
        </div>
      </div>

      {/* Add dialog */}
      {addOpen && (
        <ReceivableDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
          isPending={isPending}
          userEmail={user?.email}
        />
      )}

      {/* Edit dialog */}
      {editingItem && (
        <ReceivableDialog
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEdit}
          onDelete={() => { setEditingItem(null); setDeletingId(editingItem.id); }}
          initial={rowToForm(editingItem)}
          editingId={editingItem.id}
          isPending={isPending}
          link={linkMap[editingItem.id]}
          onInvite={(email, notes) => handleInvite(editingItem.id, email, notes)}
          onCancelInvite={() => {
            const l = linkMap[editingItem.id];
            if (l) handleCancelLink(l.id);
          }}
          userEmail={user?.email}
          inviteFeedback={inviteFeedback}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete receivable?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the receivable and any associated account link.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => setDeletingId(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" className="w-1/2" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
