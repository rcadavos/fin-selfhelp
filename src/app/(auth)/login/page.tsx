"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithOtp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : children}
    </Button>
  );
}

function LoginBrandPanel({ showFooter }: { showFooter?: boolean }) {
  return (
    <aside
      className={cn(
        "relative hidden flex-col border-border/60 bg-muted/25 p-8 lg:p-10",
        "md:flex md:min-h-0 md:overflow-hidden md:border-r",
        showFooter ? "justify-between" : "justify-center"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent" aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">OmniTrak</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Welcome back</h1>
          {showFooter ? (
            <>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Bills, cashflow, and lists in one place. Sign in to pick up where you left off.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/60 px-2.5 py-1">
                  <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Dashboard
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {showFooter ? (
        <div className="relative mt-6 shrink-0 md:mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back to home
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

function LoginLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:min-h-0">
      <LoginBrandPanel />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 md:px-6 md:py-5">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [otpPending, setOtpPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));
  const supabase = createClient();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      showSuccess("Password updated. You can log in now.");
    }
  }, [searchParams, showSuccess]);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      showError("Could not complete sign-in. Try again or use another method.");
    }
  }, [searchParams, showError]);

  async function handlePasswordSubmit(formData: FormData) {
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");
    if (!emailValue || !passwordValue) {
      showError("Email and password are required.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });
    if (error) {
      showError(error.message);
      setPassword("");
      return;
    }
    router.replace(nextPath || "/dashboard");
    router.refresh();
  }

  async function handleOtpSubmit(formData: FormData) {
    setOtpPending(true);
    const result = await signInWithOtp(formData);
    setOtpPending(false);
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  if (loading || user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:min-h-0">
        <LoginBrandPanel />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 md:px-6 md:py-5">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:min-h-0">
      {/* Mobile: compact top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <Link href="/" className="text-base font-semibold tracking-tight">
          OmniTrak
        </Link>
        <ThemeToggle />
      </header>

      <LoginBrandPanel showFooter />

      {/* Form column */}
      <div
        data-app-scroll="true"
        className={cn(
          "flex min-h-0 flex-1 flex-col justify-center px-4 py-6 sm:px-6 md:px-8 md:py-5 lg:px-10",
          "md:max-h-full md:overflow-y-auto md:overflow-x-hidden",
          "min-h-[min(100%,32rem)] md:min-h-0"
        )}
      >
        <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="space-y-1 pb-3 pt-5 text-center md:pt-4">
              <CardTitle className="text-xl md:text-lg">Log in</CardTitle>
              <CardDescription className="text-sm md:text-xs">
                Google, password, or email link — same account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pb-5 pt-0 sm:px-6 md:pb-5">
              <GoogleSignInButton next={nextPath} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  form="login-password"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <form id="login-password" action={handlePasswordSubmit} className="space-y-3">
                <input type="hidden" name="next" value={nextPath} />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      tabIndex={-1}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <SubmitButton>Log in</SubmitButton>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <form id="login-otp" action={handleOtpSubmit} className="space-y-3">
                <input type="hidden" name="next" value={nextPath} />
                <input type="hidden" name="email" value={email} />
                <p className="text-sm text-muted-foreground">
                  We&apos;ll send a one-time sign-in link to the email above. No password needed.
                </p>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={otpPending || !email.trim()}
                >
                  {otpPending ? "Sending…" : "Send one-time sign-in link"}
                </Button>
              </form>

              <p className="border-t border-border/80 pt-4 text-center text-xs text-muted-foreground">
                No account?{" "}
                <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-center md:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Back to home
            </Link>
          </div>

          <div className="mt-3 hidden justify-end md:flex">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
