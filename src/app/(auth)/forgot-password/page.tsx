"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/actions/auth";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/turnstile-widget";
import { ChevronLeft } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? "Sending…" : children}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const { showError, showSuccess } = useSnackbar();
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  async function handleSubmit(formData: FormData) {
    if (!captchaToken) {
      showError("Please complete the verification challenge.");
      return;
    }
    formData.set("captchaToken", captchaToken);
    const result = await requestPasswordReset(formData);
    setCaptchaToken("");
    turnstileRef.current?.reset();
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  return (
    <main className="app-main-centered">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we’ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={handleSubmit} className="space-y-4">
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
            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              action="password-reset"
            />
            <SubmitButton disabled={!captchaToken}>Send reset link</SubmitButton>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />Back to home
      </Link>
    </main>
  );
}
