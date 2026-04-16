"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/actions/auth";
import { ChevronLeft } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { passwordResetRequestSchema } from "@/lib/validation/forms";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : children}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const { showError, showSuccess } = useSnackbar();

  async function handleSubmit(formData: FormData) {
    const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      showError(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    const result = await requestPasswordReset(formData);
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
            <SubmitButton>Send reset link</SubmitButton>
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
