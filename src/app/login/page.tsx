"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, signInWithOtp } from "@/actions/auth";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : children}
    </Button>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useSnackbar();
  const [otpPending, setOtpPending] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      showSuccess("Password updated. You can log in now.");
    }
  }, [searchParams, showSuccess]);

  async function handlePasswordSubmit(formData: FormData) {
    const result = await signIn(formData);
    if (result?.error) showError(result.error);
  }

  async function handleOtpSubmit(formData: FormData) {
    setOtpPending(true);
    const result = await signInWithOtp(formData);
    setOtpPending(false);
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Sign in to save and load your budget data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password login */}
          <form action={handlePasswordSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
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
              />
            </div>
            <SubmitButton>Log in with password</SubmitButton>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* One-time password (magic link) */}
          <form action={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp-email">One-time sign-in link</Label>
              <Input
                id="otp-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={otpPending}
              />
              <p className="text-xs text-muted-foreground">
                We’ll send a one-time link to this email. No password needed.
              </p>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={otpPending}
            >
              {otpPending ? "Sending link…" : "Send one-time sign-in link"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  );
}
