"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithOtp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { Eye, EyeOff, Mail } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, PanelStatement, PanelRow, AuthLoader } from "@/components/auth/passbook-panel";
import { PassbookCheckbox } from "@/components/auth/passbook-checkbox";
import { Amount } from "@/components/passbook/amount";

type AuthTab = "password" | "otp";

/** Map trivial raw Supabase errors to friendlier copy; pass others through. */
function friendlyAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email or password doesn’t match our records.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return raw;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Signing in…" : children}
    </Button>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [otpPending, setOtpPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<AuthTab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formMessage, setFormMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [today, setToday] = useState("");
  const nextPath = safeNextPath(searchParams.get("next"));
  const supabase = createClient();
  const tabRefs = useRef<Record<AuthTab, HTMLButtonElement | null>>({ password: null, otp: null });

  useEffect(() => {
    setToday(
      new Date()
        .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        .toUpperCase()
    );
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setFormMessage({ type: "success", text: "Password updated. You can log in now." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setFormMessage({
        type: "error",
        text: "Could not complete sign-in. Try again or use another method.",
      });
    }
  }, [searchParams]);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    setOtpSent(false);
    setUnconfirmedEmail(null);
  }

  function selectTab(tab: AuthTab) {
    setAuthTab(tab);
    setFormMessage(null);
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: AuthTab = authTab === "password" ? "otp" : "password";
    selectTab(next);
    tabRefs.current[next]?.focus();
  }

  async function handlePasswordSubmit(formData: FormData) {
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");
    if (!emailValue || !passwordValue) {
      setFormMessage({ type: "error", text: "Email and password are required." });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setUnconfirmedEmail(emailValue);
        setPassword("");
        return;
      }
      setFormMessage({ type: "error", text: friendlyAuthError(error.message) });
      setPassword("");
      return;
    }
    if (!rememberMe) {
      // Remove persisted session so it clears when the browser tab closes
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-")) localStorage.removeItem(k);
      });
    }
    setFormMessage(null);
    router.replace(nextPath || "/dashboard");
    router.refresh();
  }

  async function handleOtpSubmit(formData: FormData) {
    setOtpPending(true);
    setFormMessage(null);
    const result = await signInWithOtp(formData);
    if (result?.error) {
      setFormMessage({ type: "error", text: result.error });
      setOtpPending(false);
    } else if (result?.message) {
      setFormMessage({ type: "success", text: result.message });
      setOtpSent(true);
      setOtpPending(false);
    }
  }

  if (loading || user) {
    return <AuthLoader />;
  }

  const panel = (
    <>
      <p className="max-w-[34ch] text-[15px] leading-relaxed text-panel-muted">
        Your ledger is where you left it — expenses, bills, savings, and goals, all in one place.
      </p>
      <div className="mt-7">
        <PanelStatement title="Tracked accounts" meta={today} label="Sample account statement">
          <PanelRow label="GCash" value={<Amount formatted="₱8,412.30" />} />
          <PanelRow label="BPI Savings" value={<Amount formatted="₱52,300.00" />} />
          <PanelRow label="Cash on hand" value={<Amount formatted="₱3,150.00" />} last />
          <PanelRow total label="Tracked balance" value={<Amount formatted="₱63,862.30" className="text-panel-accent" />} />
          <div className="mt-3 flex items-center justify-between border-t border-panel-foreground/15 pt-2.5">
            <span className="text-[11.5px] text-panel-muted">6-month trend</span>
            <svg width="64" height="18" viewBox="0 0 64 18" fill="none" className="text-panel-accent" aria-hidden>
              <polyline
                points="1,14 12,11 23,12 34,7 45,9 56,4 62,5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="62" cy="5" r="2.2" fill="currentColor" />
            </svg>
          </div>
        </PanelStatement>
      </div>
    </>
  );

  const stripAccessory = today ? (
    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-panel-muted">{today}</span>
  ) : null;

  return (
    <AuthShell panel={panel} stripAccessory={stripAccessory}>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Log in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
          Create your account
        </Link>
      </p>

      <div
        role="tablist"
        aria-label="Sign-in method"
        className="mt-6 grid grid-cols-2 gap-1 surface border border-hairline-strong bg-card p-1"
      >
        {(["password", "otp"] as const).map((tab) => {
          const active = authTab === tab;
          return (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={active}
              aria-controls={`panel-${tab}`}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTab(tab)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                "h-9 rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "password" ? "Password" : "One-time link"}
            </button>
          );
        })}
      </div>

      {unconfirmedEmail ? (
        <div
          role="alert"
          className="mt-4 flex gap-3 surface border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-warning"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Please confirm your email before logging in. Check your inbox for{" "}
            <span className="font-medium">{unconfirmedEmail}</span> and click the confirmation link.
          </span>
        </div>
      ) : formMessage ? (
        <div
          role={formMessage.type === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 surface border px-3 py-2.5 text-sm",
            formMessage.type === "error"
              ? "border-destructive/50 text-destructive"
              : "border-primary/40 bg-primary/[0.08] text-primary"
          )}
        >
          {formMessage.text}
        </div>
      ) : null}

      {/* Password panel */}
      <form
        id="panel-password"
        role="tabpanel"
        aria-labelledby="tab-password"
        action={handlePasswordSubmit}
        className="mt-4 space-y-4"
        hidden={authTab !== "password"}
      >
        <input type="hidden" name="next" value={nextPath} />
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
            value={email}
            onChange={handleEmailChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="h-11 pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <PassbookCheckbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Keep me logged in
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton>Log in</SubmitButton>
      </form>

      {/* One-time link panel */}
      <form
        id="panel-otp"
        role="tabpanel"
        aria-labelledby="tab-otp"
        action={handleOtpSubmit}
        className="mt-4 space-y-4"
        hidden={authTab !== "otp"}
      >
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="h-11"
            value={email}
            onChange={handleEmailChange}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send a one-time sign-in link to the email above. No password needed.
        </p>
        <Button type="submit" className="h-11 w-full" disabled={otpPending || otpSent || !email.trim()}>
          {otpPending ? "Sending…" : otpSent ? "Link sent — check your email" : "Send one-time sign-in link"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton next={nextPath} />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        We&apos;ll never sell your personal info.
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoader />}>
      <LoginContent />
    </Suspense>
  );
}
