"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { BadgeCheck, ChevronLeft, Lock, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : children}
    </Button>
  );
}

function SignupBrandPanel({ showFooter }: { showFooter?: boolean }) {
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Create your account</h1>
          {showFooter ? (
            <>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Track bills, cashflow, and lists in one place. Start free and add more when you&apos;re ready.
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Add goals to plan short-term, long-term, and lifetime targets from day one.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/60 px-2.5 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Free to start
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

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(formData: FormData) {
    const result = await signUp(formData);
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  if (loading || user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:min-h-0">
        <SignupBrandPanel />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 md:px-6 md:py-5">
          <p className="text-sm text-muted-foreground">{user ? "Redirecting…" : "Loading…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2 md:min-h-0">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <Link href="/" className="text-base font-semibold tracking-tight">
          OmniTrak
        </Link>
        <ThemeToggle />
      </header>

      <SignupBrandPanel showFooter />

      <div
        data-app-scroll="true"
        className={cn(
          "flex min-h-0 flex-1 flex-col justify-center px-4 py-6 sm:px-6 md:px-8 md:py-5 lg:px-10",
          "md:max-h-full md:overflow-y-auto md:overflow-x-hidden",
          "min-h-[min(100%,32rem)] md:min-h-0"
        )}
      >
        <div className="mx-auto w-full max-w-sm sm:max-w-md">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="space-y-1 pb-3 pt-5 text-center md:pt-4">
              <CardTitle className="text-xl md:text-lg">Sign up</CardTitle>
              <CardDescription className="text-sm md:text-xs">
                Start with bills, lists, and goals in a single dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 pb-5 pt-0 sm:px-6 md:pb-5">
              <form action={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div
                  className="space-y-2 text-xs leading-snug text-muted-foreground/80"
                  role="status"
                  aria-label="Privacy and security"
                >
                  <div className="flex gap-2">
                    <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                    <span>Your information is securely encrypted</span>
                  </div>
                  <div className="flex gap-2">
                    <BadgeCheck className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                    <span>We&apos;ll never sell your personal info</span>
                  </div>
                </div>
                <SubmitButton>Create account</SubmitButton>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <GoogleSignInButton next="/dashboard" />

              <p className="border-t border-border/80 pt-4 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                  Log in
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
