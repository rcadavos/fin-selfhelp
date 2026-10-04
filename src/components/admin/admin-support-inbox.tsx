"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ContentHeader } from "@/components/app/content-header";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  deleteSupportRequest,
  setSupportRequestStatus,
  type SupportRequestForAdmin,
} from "@/actions/support";
import {
  adminSupportRequestsQueryOptions,
  invalidateAdminSupportRequests,
} from "@/lib/query/support-requests";
import { ADMIN_ALERT_TIME_ZONE } from "@/lib/constants/admin-alerts";
import {
  ADMIN_SUPPORT_REQUESTS_LIMIT,
  ADMIN_SUPPORT_REQUESTS_PAGE_SIZE,
  SUPPORT_REPLY_SUBJECT,
  SUPPORT_REQUEST_STATUS_LABELS,
  SUPPORT_TRANSCRIPT_SPEAKER_LABELS,
  type SupportRequestStatus,
} from "@/lib/constants/support-requests";
import { Check, Loader2, Mail, RotateCcw, Search, Trash2 } from "lucide-react";

type InboxFilter = SupportRequestStatus | "all";

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_ALERT_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Manila time, assembled from parts: this inbox is server-prefetched, and the
 * spacing Intl puts between parts differs between Node's ICU and the browser's,
 * which would trip a hydration mismatch.
 */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const part = Object.fromEntries(DATE_TIME_FORMAT.formatToParts(d).map((p) => [p.type, p.value]));
  return `${part.month} ${part.day}, ${part.year} • ${part.hour}:${part.minute} ${part.dayPeriod}`;
}

function replyHref(email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(SUPPORT_REPLY_SUBJECT)}`;
}

function SupportRequestItem({
  request,
  busy,
  pendingAction,
  onToggleStatus,
  onDelete,
}: {
  request: SupportRequestForAdmin;
  busy: boolean;
  pendingAction: "status" | "delete" | null;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const isOpen = request.status === "open";

  return (
    <li className="surface space-y-3 border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{request.name ?? "No name given"}</p>
          <a
            href={replyHref(request.email)}
            className="break-all text-sm text-primary underline-offset-4 hover:underline"
          >
            {request.email}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!request.emailSent && (
            <Badge variant="warning" title="The notification email failed, so this request is only here.">
              Email not sent
            </Badge>
          )}
          <Badge variant={isOpen ? "pending" : "success"}>
            {SUPPORT_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {formatWhen(request.createdAt)}
        {request.resolvedAt && ` • Resolved ${formatWhen(request.resolvedAt)}`}
      </p>

      <p className="whitespace-pre-wrap break-words text-sm">{request.message}</p>

      {request.transcript.length > 0 && (
        <details className="rounded-lg border bg-background/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Chat before the request • {request.transcript.length}{" "}
            {request.transcript.length === 1 ? "message" : "messages"}
          </summary>
          <ul className="space-y-2 border-t px-3 py-3">
            {request.transcript.map((line, i) => (
              <li key={i} className="whitespace-pre-wrap break-words text-sm">
                <span className={line.role === "user" ? "font-semibold" : "font-semibold text-primary"}>
                  {SUPPORT_TRANSCRIPT_SPEAKER_LABELS[line.role]}:
                </span>{" "}
                {line.text}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" asChild>
          <a href={replyHref(request.email)}>
            <Mail aria-hidden />
            Reply
          </a>
        </Button>
        <Button size="sm" variant="outline" onClick={onToggleStatus} disabled={busy}>
          {pendingAction === "status" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : isOpen ? (
            <Check aria-hidden />
          ) : (
            <RotateCcw aria-hidden />
          )}
          {isOpen ? "Mark resolved" : "Reopen"}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
          {pendingAction === "delete" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Trash2 aria-hidden />
          )}
          Delete
        </Button>
      </div>
    </li>
  );
}

const EMPTY_COPY: Record<InboxFilter, string> = {
  open: "No open requests. You're all caught up.",
  resolved: "No resolved requests yet.",
  all: "No support requests yet. Messages sent with Contact support in the landing-page chat will show up here.",
};

export function AdminSupportInbox() {
  const { data: inbox } = useSuspenseQuery(adminSupportRequestsQueryOptions());
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useSnackbar();

  const [filter, setFilter] = useState<InboxFilter>("open");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ADMIN_SUPPORT_REQUESTS_PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<SupportRequestForAdmin | null>(null);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SupportRequestStatus }) => {
      const res = await setSupportRequestStatus(id, status);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: (_, { status }) => {
      showSuccess(status === "resolved" ? "Marked resolved." : "Reopened.");
      return invalidateAdminSupportRequests(queryClient);
    },
    onError: (e) => showError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSupportRequest(id);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      showSuccess("Request deleted.");
      return invalidateAdminSupportRequests(queryClient);
    },
    onError: (e) => showError(e.message),
  });

  const total = inbox.counts.open + inbox.counts.resolved;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inbox.requests.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q ||
          r.email.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q))
    );
  }, [inbox.requests, filter, search]);

  const visible = filtered.slice(0, visibleCount);
  const busy = statusMutation.isPending || deleteMutation.isPending;

  function pendingActionFor(id: string): "status" | "delete" | null {
    if (statusMutation.isPending && statusMutation.variables?.id === id) return "status";
    if (deleteMutation.isPending && deleteMutation.variables === id) return "delete";
    return null;
  }

  function changeFilter(value: string) {
    setFilter(value as InboxFilter);
    setVisibleCount(ADMIN_SUPPORT_REQUESTS_PAGE_SIZE);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setVisibleCount(ADMIN_SUPPORT_REQUESTS_PAGE_SIZE);
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <ContentHeader
        title="Support"
        subtitle="Messages sent with Contact support in the landing-page chat. Reply by email, then mark them resolved."
        className="mb-0"
      />

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Tabs value={filter} onValueChange={changeFilter} className="min-w-0">
              <TabsList className="border-b-0">
                <TabsTrigger value="open">Open • {inbox.counts.open}</TabsTrigger>
                <TabsTrigger value="resolved">Resolved • {inbox.counts.resolved}</TabsTrigger>
                <TabsTrigger value="all">All • {total}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Search email, name, or message"
                className="pl-9"
                aria-label="Search support requests"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">
              {search.trim() ? <>No requests match &ldquo;{search.trim()}&rdquo;.</> : EMPTY_COPY[filter]}
            </p>
          ) : (
            <ul className="space-y-4">
              {visible.map((request) => (
                <SupportRequestItem
                  key={request.id}
                  request={request}
                  busy={busy}
                  pendingAction={pendingActionFor(request.id)}
                  onToggleStatus={() =>
                    statusMutation.mutate({
                      id: request.id,
                      status: request.status === "open" ? "resolved" : "open",
                    })
                  }
                  onDelete={() => setDeleteTarget(request)}
                />
              ))}
            </ul>
          )}

          {filtered.length > visible.length && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((n) => n + ADMIN_SUPPORT_REQUESTS_PAGE_SIZE)}
              >
                Show more • {filtered.length - visible.length} left
              </Button>
            </div>
          )}

          {total > inbox.requests.length && (
            <p className="text-center text-xs text-muted-foreground">
              Showing the newest {ADMIN_SUPPORT_REQUESTS_LIMIT.toLocaleString("en-US")} of{" "}
              {total.toLocaleString("en-US")} requests.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this request?"
        description={
          deleteTarget
            ? `The message from ${deleteTarget.email} will be removed permanently. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </main>
  );
}
