"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ContentHeader } from "@/components/app/content-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Check, Loader2, Mail, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const PW_RULES = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "At least 1 uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "At least 1 number", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "At least 1 symbol", test: (pw: string) => /[^a-zA-Z0-9]/.test(pw) },
] as const;

function passwordScore(pw: string): number {
  return PW_RULES.reduce((n, r) => n + (r.test(pw) ? 1 : 0), 0);
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"] as const;
const STRENGTH_COLOR = [
  "bg-border",
  "bg-destructive",
  "bg-warning",
  "bg-primary/70",
  "bg-primary",
] as const;

export default function ProfileSecurityPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const score = passwordScore(password);
  const isStrong = score >= 4;
  const hasEmailPassword = (user?.identities ?? []).some((i) => i.provider === "email");
  const currentPasswordFilled = currentPassword.length > 0;
  const newPasswordEnabled = !hasEmailPassword || currentPasswordFilled;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      showError("Missing account email.");
      return;
    }
    if (hasEmailPassword && !currentPasswordFilled) {
      showError("Please enter your current password.");
      return;
    }
    if (!isStrong) {
      showError("Please meet all password requirements.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    if (hasEmailPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        setSubmitting(false);
        showError("Current password is incorrect.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      showError(error.message);
      return;
    }
    setSubmitting(false);
    showSuccess(hasEmailPassword ? "Password updated." : "Password set. You can now sign in with email and password.");
    router.push("/account/profile");
  }

  async function handleRequestReset() {
    if (!user?.email) {
      showError("Missing account email.");
      return;
    }
    setSendingReset(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess(`Password reset link sent to ${user.email}.`);
  }

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <DashboardSkeleton variant="page" />
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2">
      <ContentHeader
        title="Security"
        subtitle="Change your password."
        icon={Shield}
        className="mb-6"
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {hasEmailPassword ? (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  name="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRequestReset}
                    disabled={sendingReset}
                  >
                    {sendingReset ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" aria-hidden />
                        Forgot password? Email me a reset link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="surface border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                You signed in with Google and don&apos;t have a password yet. Set one below to also sign in with email and password.
              </div>
            )}
            <div
              className={cn(
                "space-y-2 transition-opacity",
                newPasswordEnabled ? "opacity-100" : "pointer-events-none opacity-50"
              )}
              aria-disabled={!newPasswordEnabled}
            >
              <Label htmlFor="password">{hasEmailPassword ? "New password" : "Password"}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                disabled={!newPasswordEnabled}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= score ? STRENGTH_COLOR[score] : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Strength:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        score <= 1 && "text-destructive",
                        score === 2 && "text-warning",
                        score >= 3 && "text-primary"
                      )}
                    >
                      {STRENGTH_LABEL[score]}
                    </span>
                  </p>
                </div>
              )}
              {/* Requirements checklist */}
              <ul className="space-y-1" aria-label="Password requirements">
                {PW_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-1.5 text-[11px] transition-colors duration-200",
                        met ? "text-primary" : "text-muted-foreground/70"
                      )}
                    >
                      <span className="relative h-3 w-3 shrink-0">
                        <svg
                          viewBox="0 0 12 12"
                          className={cn(
                            "absolute inset-0 h-3 w-3 transition-all duration-200",
                            met ? "scale-75 opacity-0" : "scale-100 opacity-100"
                          )}
                          aria-hidden
                        >
                          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <Check
                          className={cn(
                            "absolute inset-0 h-3 w-3 transition-all duration-200",
                            met ? "scale-100 opacity-100" : "scale-75 opacity-0"
                          )}
                          aria-hidden
                        />
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div
              className={cn(
                "space-y-2 transition-opacity",
                newPasswordEnabled ? "opacity-100" : "pointer-events-none opacity-50"
              )}
              aria-disabled={!newPasswordEnabled}
            >
              <Label htmlFor="confirm">{hasEmailPassword ? "Confirm new password" : "Confirm password"}</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat password"
                disabled={!newPasswordEnabled}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!isStrong || !newPasswordEnabled || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {hasEmailPassword ? "Updating…" : "Saving…"}
                  </>
                ) : (
                  hasEmailPassword ? "Change Password" : "Set Password"
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account/profile">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
