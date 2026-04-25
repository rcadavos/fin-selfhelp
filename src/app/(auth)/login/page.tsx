"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithOtp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import Image from "next/image";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
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
          <Image src="/omnitrak-logo.png" alt="OmniTrak" width={140} height={36} className="object-contain" priority />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">Welcome back</h1>
          {showFooter ? (
            <>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Log in to continue tracking your expenses, bills, savings, and goals.
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
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <Image src="/favicon.png" alt="" aria-hidden className="h-20 w-20 animate-breathing" width={80} height={80} />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [otpPending, setOtpPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [authTab, setAuthTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [formMessage, setFormMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
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
      setFormMessage({ type: "error", text: error.message });
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
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Image src="/favicon.png" alt="" aria-hidden className="h-20 w-20 animate-breathing" width={80} height={80} />
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
          <LoginBrandPanel showFooter />

          {/* Form panel */}
          <div
            data-app-scroll="true"
            className="flex flex-col justify-center overflow-y-auto bg-background px-5 py-7 sm:px-8 md:max-h-[90vh]"
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="space-y-1 pb-6 text-center">
                <h2 className="text-xl font-semibold">Log in</h2>
                <p className="text-center text-xs text-muted-foreground">
                  No account?{" "}
                  <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-flex w-full items-center gap-1 rounded-md border bg-muted/40 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={authTab === "password" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs"
                    onClick={() => setAuthTab("password")}
                  >
                    Login
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={authTab === "otp" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs"
                    onClick={() => setAuthTab("otp")}
                  >
                    One-time login link
                  </Button>
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
                    onChange={(e) => { setEmail(e.target.value); setOtpSent(false); }}
                  />
                </div>
                {formMessage ? (
                  <div
                    role={formMessage.type === "error" ? "alert" : "status"}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      formMessage.type === "error"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {formMessage.text}
                  </div>
                ) : null}

                {authTab === "password" ? (
                  <form id="login-password" action={handlePasswordSubmit} className="space-y-3">
                    <input type="hidden" name="next" value={nextPath} />
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="flex items-center justify-between pt-0.5">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">Keep me logged in</span>
                        </label>
                        <Link
                          href="/forgot-password"
                          tabIndex={-1}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>
                    <SubmitButton>Log in</SubmitButton>
                  </form>
                ) : (
                  <form id="login-otp" action={handleOtpSubmit} className="space-y-3">
                    <input type="hidden" name="next" value={nextPath} />
                    <input type="hidden" name="email" value={email} />
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll send a one-time sign-in link to the email above. No password needed.
                    </p>
                    <Button
                      type="submit"
                      className="h-11 w-full"
                      disabled={otpPending || otpSent || !email.trim()}
                    >
                      {otpPending ? "Sending…" : otpSent ? "Link sent — check your email" : "Send one-time sign-in link"}
                    </Button>
                  </form>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                <GoogleSignInButton next={nextPath} />

              </div>
            </div>
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
