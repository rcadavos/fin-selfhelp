"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useUser } from "@/hooks/use-user";
import { ContentHeader } from "@/components/app/content-header";
import { useUserPreferences } from "@/contexts/user-preferences-context";
import {
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  NUMBER_GROUPING_OPTIONS,
} from "@/lib/user-preferences";
import { Settings, Bell, CreditCard, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { preferences: p, updatePreference, formatCurrency, formatDate, formatTime, formatNumber } =
    useUserPreferences();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const previewNow = new Date();
  const notifMasterOff = !p.notificationsEnabled;

  return (
    <div className="w-full py-2">
      <ContentHeader
        title="Settings"
        subtitle="Saved to your account and synced when you sign in."
        icon={Settings}
        className="mb-6"
      />

      <Card className="mb-6 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account sharing</CardTitle>
          <CardDescription>Invite a partner to view your My Expenses or to-buy list (read-only).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/account/settings/sharing">Manage sharing &amp; invites</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
          <CardDescription>How dates, times, money, and numbers are shown across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date-format">Date format</Label>
            <Select value={p.dateFormat} onValueChange={(v) => updatePreference("dateFormat", v as typeof p.dateFormat)}>
              <SelectTrigger id="date-format" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-format">Time format</Label>
            <Select value={p.timeFormat} onValueChange={(v) => updatePreference("timeFormat", v as typeof p.timeFormat)}>
              <SelectTrigger id="time-format" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={p.currency} onValueChange={(v) => updatePreference("currency", v)}>
              <SelectTrigger id="currency" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={p.language} onValueChange={(v) => updatePreference("language", v as typeof p.language)}>
              <SelectTrigger id="language" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              UI copy stays English for now; this affects locale for dates, times, and number grouping.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number-format">Number format</Label>
            <Select
              value={p.numberGrouping}
              onValueChange={(v) => updatePreference("numberGrouping", v as typeof p.numberGrouping)}
            >
              <SelectTrigger id="number-format" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_GROUPING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} — sample {o.example}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Today</dt>
                <dd className="font-medium tabular-nums">{formatDate(previewNow)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Time</dt>
                <dd className="font-medium tabular-nums">{formatTime(previewNow)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sample amount</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(1234567)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Plain number</dt>
                <dd className="font-medium tabular-nums">{formatNumber(1234567)}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications & Reminders</CardTitle>
          <CardDescription>
            Control in-app email-related preferences. Actual emails still depend on your subscription and due dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <p id="label-notifications" className="text-sm font-medium">
                  Notifications
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Master switch for bill reminders and subscription alerts.
              </p>
            </div>
            <ToggleSwitch
              checked={p.notificationsEnabled}
              onCheckedChange={(v) => updatePreference("notificationsEnabled", v)}
              aria-labelledby="label-notifications"
            />
          </div>

          <div
            className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${notifMasterOff ? "opacity-50" : ""}`}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" aria-hidden />
                <p id="label-bill" className="text-sm font-medium">
                  Bill reminders
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Reminders before expense due dates (when enabled on each expense and you are on Pro).
              </p>
            </div>
            <ToggleSwitch
              checked={p.billRemindersEnabled}
              disabled={notifMasterOff}
              onCheckedChange={(v) => updatePreference("billRemindersEnabled", v)}
              aria-labelledby="label-bill"
            />
          </div>

          <div
            className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${notifMasterOff ? "opacity-50" : ""}`}
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" aria-hidden />
                <p id="label-sub" className="text-sm font-medium">
                  Subscription alerts
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Heads-up about renewals, billing, or payment issues.
              </p>
            </div>
            <ToggleSwitch
              checked={p.subscriptionAlertsEnabled}
              disabled={notifMasterOff}
              onCheckedChange={(v) => updatePreference("subscriptionAlertsEnabled", v)}
              aria-labelledby="label-sub"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/account/profile">Profile</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
