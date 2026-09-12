"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { BadgeCheck, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useUser } from "@/hooks/use-user";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { TRIAL_LABEL } from "@/lib/constants/trial";
import { AuthShell, PanelStatement, PanelRow, PanelValue, AuthLoader } from "@/components/auth/passbook-panel";
import { PassbookCheckbox } from "@/components/auth/passbook-checkbox";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
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
const STRENGTH_BAR = [
  "bg-hairline-strong",
  "bg-destructive",
  "bg-warning",
  "bg-primary/70",
  "bg-primary",
] as const;

/** Grammatical join for the "still needed" validation summary. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

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
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    if (fullNameError) {
      setFormError("Please fix your full name before continuing.");
      return;
    }
    const missing: string[] = [];
    if (!email) missing.push("your email");
    if (passwordScore(password) < 4) missing.push("a stronger password");
    if (!agreed) missing.push("agreement to the terms");
    if (missing.length) {
      setFormError(`Still needed: ${joinList(missing)}.`);
      return;
    }
    setFormError(null);
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

  async function handleResend() {
    if (resendCooldown > 0 || !submittedEmail) return;
    setResendCooldown(30);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: submittedEmail });
    if (error) showError(error.message);
    else showSuccess("Confirmation link sent. Check your email.");
  }

  const score = passwordScore(password);

  if (loading || user) {
    return <AuthLoader />;
  }

  const panel = (
    <>
      <p className="max-w-[36ch] text-[15px] leading-relaxed text-panel-muted">
        Every new account opens with a{" "}
        <strong className="font-semibold text-panel-foreground">{TRIAL_LABEL}</strong> — full access, no card
        required. When it ends, the Free plan is yours to keep.
      </p>
      <div className="mt-7">
        <PanelStatement title="New account" meta="Opens today" label="What your new account includes">
          <PanelRow label="Pro trial, 14 days" value={<PanelValue>Included</PanelValue>} />
          <PanelRow label="Card required" value={<PanelValue>None</PanelValue>} />
          <PanelRow label="Bank linking" value={<PanelValue>None</PanelValue>} />
          <PanelRow label="Free plan after trial" value={<PanelValue>Yours</PanelValue>} last />
        </PanelStatement>
      </div>
      <div role="status" className="mt-6 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 text-sm text-panel-muted">
          <Lock className="h-4 w-4 shrink-0 text-panel-accent" aria-hidden />
          Your information is securely encrypted
        </div>
        <div className="flex items-center gap-2.5 text-sm text-panel-muted">
          <BadgeCheck className="h-4 w-4 shrink-0 text-panel-accent" aria-hidden />
          We&apos;ll never sell your personal info
        </div>
      </div>
    </>
  );

  const stripAccessory = (
    <span className="shrink-0 whitespace-nowrap rounded-full border border-panel-accent px-2 py-0.5 font-mono text-[10px] text-panel-accent">
      {TRIAL_LABEL}
    </span>
  );

  return (
    <AuthShell panel={panel} stripAccessory={stripAccessory}>
      {submitted ? (
        <div role="status" className="w-full">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center surface border border-primary bg-primary/[0.08] text-primary">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <h2
            ref={successHeadingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight outline-none sm:text-3xl"
          >
            Check your email
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We sent a confirmation link to{" "}
            {submittedEmail ? (
              <span className="font-medium text-foreground">{submittedEmail}</span>
            ) : (
              "your email address"
            )}
            . Click it to activate your account and start your {TRIAL_LABEL}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder, or resend below.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 h-11 w-full sm:w-auto sm:min-w-[240px]"
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation link"}
          </Button>
          <div className="mt-5">
            <Link
              href="/login"
              className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Back to log in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
              Log in
            </Link>
          </p>

          <form action={handleSubmit} className="mt-6 space-y-4">
            {formError ? (
              <div
                role="alert"
                className="surface border border-destructive/50 px-3 py-2.5 text-sm text-destructive"
              >
                {formError}
              </div>
            ) : null}

            {/* Full name */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="full_name">Full name</Label>
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </div>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={fullName}
                onChange={handleFullNameChange}
                maxLength={FULL_NAME_MAX}
                aria-invalid={!!fullNameError}
                aria-describedby={fullNameError ? "full_name_error" : undefined}
                className={cn("h-11", fullNameError && "border-destructive focus-visible:ring-destructive/30")}
              />
              {fullNameError && (
                <p id="full_name_error" role="alert" className="text-xs text-destructive">
                  {fullNameError}
                </p>
              )}
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
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>

              {/* Progressive strength — appears once typing */}
              {password.length > 0 && (
                <div className="space-y-2 pt-1" aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= score ? STRENGTH_BAR[score] : "bg-hairline-strong"
                        )}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
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
                  <ul
                    className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-4"
                    aria-label="Password requirements"
                  >
                    {PW_RULES.map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            met ? "text-primary" : "text-muted-foreground"
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
              )}
            </div>

            {/* Agreement */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <PassbookCheckbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
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

            <SubmitButton />
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton next="/dashboard" />

          {/* Trust reassurance for mobile, where the passbook panel is hidden. */}
          <div role="status" className="mt-6 flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              Your information is securely encrypted
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              We&apos;ll never sell your personal info
            </div>
          </div>
        </>
      )}
    </AuthShell>
  );
}
