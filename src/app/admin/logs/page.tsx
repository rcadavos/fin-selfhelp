import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bell, Mail } from "lucide-react";
import { getAdminReminderLogs, getAdminUserNotifications } from "@/actions/admin-logs";

async function AdminLogsInner() {
  const [logsRes, notifRes] = await Promise.all([
    getAdminReminderLogs(100),
    getAdminUserNotifications(undefined, 100),
  ]);

  const logs = logsRes.logs;
  const notifications = notifRes.notifications;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8" style={{ height: "calc(100vh - 30px)" }}>
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bell className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          Reminder &amp; Notification Logs
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Debug view for reminder emails and in-app notifications.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 h-[calc(100%-80px)]">
        {/* Reminder Email Logs */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Reminder Email Logs
            </CardTitle>
            <CardDescription>Sent reminder emails (dedupe log)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminder logs yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="surface border border-border bg-muted/30 p-3 text-xs">
                    <div className="font-semibold text-foreground mb-1">{log.full_name ?? "Unknown User"}</div>
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
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              In-App Notifications
            </CardTitle>
            <CardDescription>User notifications from all users</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="surface border border-border bg-muted/30 p-3">
                    <div className="font-semibold text-sm mb-1">{notif.full_name ?? "Unknown User"}</div>
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
