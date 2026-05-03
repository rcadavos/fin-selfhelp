"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentHeader } from "@/components/app/content-header";
import { Loader2, Bell, Mail } from "lucide-react";
import { getAdminReminderLogs, getAdminUserNotifications } from "@/actions/admin-logs";
import { queryOptions } from "@tanstack/react-query";

function logsQueryOptions() {
  return queryOptions({
    queryKey: ["admin", "reminder-logs"],
    queryFn: async () => {
      const res = await getAdminReminderLogs(100);
      if (res.error) throw new Error(res.error);
      return res.logs;
    },
  });
}

function notificationsQueryOptions() {
  return queryOptions({
    queryKey: ["admin", "user-notifications"],
    queryFn: async () => {
      const res = await getAdminUserNotifications(undefined, 100);
      if (res.error) throw new Error(res.error);
      return res.notifications;
    },
  });
}

function AdminLogsInner() {
  const { data: logs } = useSuspenseQuery(logsQueryOptions());
  const { data: notifications } = useSuspenseQuery(notificationsQueryOptions());

  return (
    <main className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <ContentHeader
        title="Reminder & Notification Logs"
        subtitle="Debug view for reminder emails and in-app notifications."
        icon={Bell}
        className="mb-0"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reminder Email Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Reminder Email Logs
            </CardTitle>
            <CardDescription>Sent reminder emails (dedupe log)</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminder logs yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                    <div className="font-mono break-all text-muted-foreground mb-1">{log.dedupe_key}</div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{log.channel}</span>
                      <span>{new Date(log.sent_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              In-App Notifications
            </CardTitle>
            <CardDescription>User notifications from all users</CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="font-medium text-sm mb-1">{notif.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">{notif.body}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5">{notif.kind}</span>
                      <span className="rounded bg-secondary/10 px-1.5 py-0.5">{notif.read_at ? "Read" : "Unread"}</span>
                      <span className="font-mono break-all">{notif.dedupe_key}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(notif.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    }>
      <AdminLogsInner />
    </Suspense>
  );
}
