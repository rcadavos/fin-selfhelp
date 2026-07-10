"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/actions/auth";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { AuthShell, PanelStatement, PanelRow, PanelValue } from "@/components/auth/passbook-panel";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Sending…" : children}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const { showError, showSuccess } = useSnackbar();

  async function handleSubmit(formData: FormData) {
    const result = await requestPasswordReset(formData);
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  const panel = (
    <>
      <p className="max-w-[34ch] text-[15px] leading-relaxed text-panel-muted">
        Forgot your password? We&apos;ll email a secure link to set a new one. Your ledger stays exactly where you
        left it.
      </p>
      <div className="mt-7">
        <PanelStatement title="Password reset" meta="Secure link" label="How password reset works">
          <PanelRow label="Reset link" value={<PanelValue>Emailed</PanelValue>} />
          <PanelRow label="Link expires in" value={<PanelValue>1 hour</PanelValue>} />
          <PanelRow label="Your account data" value={<PanelValue>Untouched</PanelValue>} last />
        </PanelStatement>
      </div>
    </>
  );

  return (
    <AuthShell panel={panel}>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a secure link to set a new password.
      </p>

      <form action={handleSubmit} className="mt-6 space-y-4">
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
        <SubmitButton>Send reset link</SubmitButton>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
