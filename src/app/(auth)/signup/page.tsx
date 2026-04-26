"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import Image from "next/image";
import { BadgeCheck, Check, ChevronLeft, Lock, Mail, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { cn } from "@/lib/utils";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending || disabled}>
      {pending ? "Creating Account…" : "Sign Up"}
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
          <Image src="/omnitrak-logo.png" alt="OmniTrak" width={140} height={36} className="object-contain" priority />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Create your account</h1>
          {showFooter ? (
            <>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Start tracking your expenses, bills, savings, and goals — all in one place.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/60 px-2.5 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Get Started Free
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

const FULL_NAME_MAX = 100;
const FULL_NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿĀ-ɏ\s'\-.]*$/;

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

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  function handleFullNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.length > FULL_NAME_MAX) return;
    setFullName(val);
    if (val && !FULL_NAME_RE.test(val)) {
      setFullNameError("Name may only contain letters, spaces, hyphens, apostrophes, or periods.");
    } else {
      setFullNameError(null);
    }
  }

  async function handleSubmit(formData: FormData) {
    if (fullNameError) return;
    if (!agreed) return;
    setFormError(null);
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const result = await signUp(formData);
    if (result?.error) {
      setFormError(result.error);
    } else if (result?.next) {
      router.push(result.next);
    } else if (result?.message) {
      setSubmittedEmail(email);
      setSubmitted(true);
    }
  }

  const score = passwordScore(password);
  const canSubmit = agreed && !fullNameError && score >= 4;

  if (loading || user) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">{user ? "Redirecting…" : "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-br from-primary/[0.05] via-background to-muted/20 dark:from-primary/[0.09] dark:via-background dark:to-muted/20">
      {/* page-level blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/[0.05] blur-2xl" />
      </div>

      {/* Mobile top bar */}
      <header className="relative flex h-12 shrink-0 items-center justify-between border-b bg-background/60 px-4 backdrop-blur-sm md:hidden">
        <Link href="/" className="text-base font-semibold tracking-tight">OmniTrak</Link>
        <ThemeToggle />
      </header>

      {/* Centered card */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border/80 shadow-2xl md:grid md:grid-cols-2">
          <SignupBrandPanel showFooter />

          {/* Form panel */}
          <div
            data-app-scroll="true"
            className="flex flex-col justify-center overflow-y-auto bg-background px-5 py-7 sm:px-8 md:max-h-[90vh]"
          >
            {submitted ? (
              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold">Check your email</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We sent a confirmation link to{" "}
                    {submittedEmail && (
                      <span className="font-medium text-foreground">{submittedEmail}</span>
                    )}
                    {submittedEmail ? "." : "your email address."}{" "}
                    Click it to activate your account.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive it? Check your spam folder or{" "}
                  <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                    try again
                  </Link>
                  .
                </p>
                <Link
                  href="/login"
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  Back to log in
                </Link>
              </div>
            ) : (
            <div className="mx-auto w-full max-w-sm">
              <div className="space-y-1 pb-4 text-center">
                <h2 className="text-xl font-semibold">Sign up</h2>
                <p className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                    Log in
                  </Link>
                </p>
              </div>

              <div className="space-y-4">
              <form action={handleSubmit} className="space-y-3">
                {formError ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {formError}
                  </div>
                ) : null}

                {/* Full name */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="full_name">Full name</Label>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        fullName.length >= FULL_NAME_MAX ? "text-destructive" : "text-muted-foreground/60"
                      )}
                    >
                      {fullName.length}/{FULL_NAME_MAX}
                    </span>
                  </div>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Optional"
                    value={fullName}
                    onChange={handleFullNameChange}
                    maxLength={FULL_NAME_MAX}
                    aria-invalid={!!fullNameError}
                    aria-describedby={fullNameError ? "full_name_error" : undefined}
                    className={cn(fullNameError && "border-destructive focus-visible:ring-destructive/30")}
                  />
                  {fullNameError && (
                    <p id="full_name_error" role="alert" className="text-[12px] text-destructive">
                      {fullNameError}
                    </p>
                  )}
                </div>

                {/* Security notes */}
                <div
                  className="flex flex-col gap-1.5 text-xs leading-snug text-muted-foreground/80"
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

                {/* Email */}
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
                            {/* Circle — visible when not met */}
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
                            {/* Check — visible when met */}
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

                {/* Agreement checkbox */}
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    I agree to the OmniTrak{" "}
                    <Link
                      href={LEGAL_ROUTES.privacy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link
                      href={LEGAL_ROUTES.terms}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </Link>
                  </span>
                </label>
                <SubmitButton disabled={!canSubmit} />
                
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
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
