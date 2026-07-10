"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { ContentHeader } from "@/components/app/content-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useIsAdmin } from "@/hooks/use-admin";
import { useNotifications } from "@/hooks/use-notifications";
import { queryKeys } from "@/lib/query/keys";
import {
  DEFAULT_USER_PREFERENCES,
  formatDateWithPreferences,
} from "@/lib/user-preferences";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const prefsOptional = useUserPreferencesOptional();
  const {
    items,
    unreadCount,
    markRead,
    markAllRead,
    isLoading,
    error,
    isMarkingAllRead,
    isMarkingRead,
  } = useNotifications();
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin(!loading);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testDebug, setTestDebug] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return formatDateWithPreferences(
      d,
      prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
    );
  };

  const groupedNotifications = useMemo(() => {
    const byDay = new Map<string, typeof items>();
    for (const n of items) {
      const d = new Date(n.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const list = byDay.get(dayKey) ?? [];
      list.push(n);
      byDay.set(dayKey, list);
    }
    return Array.from(byDay.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const runReminderTest = async () => {
    setTestError(null);
    setTestMessage(null);
    setTestDebug(null);
    setIsTesting(true);

    try {
      const response = await fetch("/api/notifications/test-expense-trigger", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setTestError(data?.error ?? "Could not trigger reminder test.");
      } else if (data.errors?.length) {
        setTestError(data.errors.join("; "));
      } else if (data.skipped) {
        setTestMessage("Reminder sync skipped because it is outside the regular release window.");
      } else {
        const inserted = Number(data.notificationsInserted ?? 0);
        const emailSent = Number(data.emailResult?.emailsSent ?? 0);
        const emailStatus = data.emailResult?.errors?.length
          ? ` Email failed: ${data.emailResult.errors.join("; ")}`
          : emailSent
          ? " Email reminder sent."
          : " No email reminder was sent."

        setTestMessage(
          `${inserted > 0
            ? `${inserted} in-app reminder notification${inserted === 1 ? "" : "s"} generated.`
            : "No in-app reminder notifications were generated for today."}${emailStatus}`
        );
        if (data.debug) {
          setTestDebug(data.debug);
        }
        if (data.emailResult?.debug) {
          setTestDebug((prev) => ({ ...(prev ?? {}), emailDebug: data.emailResult?.debug }));
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Failed to run the reminder test.");
    } finally {
      setIsTesting(false);
    }
  };

  const dayLabel = (dayKey: string) => {
    const d = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dayKey;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (target === today) return "Today";
    if (target === today - oneDayMs) return "Yesterday";
    return formatDateWithPreferences(
      d,
      prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
    );
  };

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <DashboardSkeleton variant="page" />
      </main>
    );
  }

  return (
    <div className="w-full py-2">
      <ContentHeader
        title="Notifications"
        subtitle="All your app reminders and updates in one place."
        icon={Bell}
        className="mb-6"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={markAllRead}
              disabled={isMarkingAllRead || unreadCount === 0}
            >
              {isMarkingAllRead ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isMarkingAllRead ? "Saving…" : "Mark all as read"}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={runReminderTest}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {isTesting ? "Testing…" : "Test expense reminders"}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="border-0 shadow-none">
        <CardHeader className="px-0">
          <CardDescription>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </CardDescription>
          {(testMessage || testError || testDebug) && (
            <div className="mt-3 space-y-2">
              {testMessage ? (
                <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  {testMessage}
                </p>
              ) : null}
              {testError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {testError}
                </p>
              ) : null}
              {testDebug ? (
                <div className="rounded-lg border border-border bg-muted px-3 py-2 space-y-1 text-xs text-muted-foreground">
                  <p className="font-mono">Today: {testDebug.todayYmd}</p>
                  <p>Expenses found: {testDebug.expensesCount}</p>
                  <p>To-do items: {testDebug.toDoCount}</p>
                  <p>Notifications generated: {testDebug.notificationsGenerated}</p>
                  {testDebug.notificationTitles?.length ? (
                    <div>
                      <p className="font-semibold mt-1">Generated notifications:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {testDebug.notificationTitles.map((title: string, i: number) => (
                          <li key={i}>{title}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2 px-0">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/80" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/80" />
            </div>
          ) : error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error.message || "Could not load notifications."}
            </p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">
                New reminders and account updates will appear here.
              </p>
            </div>
          ) : (
            groupedNotifications.map(([dayKey, dayItems]) => (
              <section key={dayKey} className="space-y-2">
                <p className="px-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {dayLabel(dayKey)}
                </p>
                {dayItems.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      n.read
                        ? "border-border bg-card hover:bg-muted/40"
                        : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => markRead(n.id)}
                    disabled={n.read || isMarkingRead}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-snug">{n.title}</p>
                      {!n.read ? (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                      ) : null}
                    </div>
                    {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                  </button>
                ))}
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
