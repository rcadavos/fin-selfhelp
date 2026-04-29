"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Check } from "lucide-react";
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
  "bg-red-500",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-600",
] as const;

export default function ProfileSecurityPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const score = passwordScore(password);
  const isStrong = score >= 4;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isStrong) {
      showError("Please meet all password requirements.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Password updated.");
    router.push("/account/profile");
  }

  if (loading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
                        score <= 1 && "text-red-500",
                        score === 2 && "text-amber-500",
                        score >= 3 && "text-emerald-600 dark:text-emerald-400"
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
                        met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70"
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
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!isStrong}>Change Password</Button>
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
