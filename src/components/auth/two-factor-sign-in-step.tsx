"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OneTimeCodeInput } from "@/components/auth/one-time-code-input";
import { useCountdown } from "@/hooks/use-countdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TWO_FACTOR_CODE_LENGTH, TWO_FACTOR_CODE_TTL_MINUTES } from "@/lib/constants/two-factor";
import {
  cancelTwoFactorSignIn,
  resendTwoFactorSignInCode,
  verifyTwoFactorSignIn,
} from "@/actions/two-factor";

type TwoFactorSignInStepProps = {
  maskedEmail: string;
  initialResendInSeconds: number;
  /** The browser now holds the session; finish the login (redirect etc.). */
  onSignedIn: () => void;
  /** Back to the password form, with an optional error to show there. */
  onRestart: (error?: string) => void;
};

type StepMessage = { type: "error" | "success"; text: string };

/** Second step of a password login for an account with two-step verification on. */
export function TwoFactorSignInStep({
  maskedEmail,
  initialResendInSeconds,
  onSignedIn,
  onRestart,
}: TwoFactorSignInStepProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<StepMessage | null>(null);
  const [resendIn, setResendIn] = useCountdown(initialResendInSeconds);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== TWO_FACTOR_CODE_LENGTH) {
      setMessage({ type: "error", text: `Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from the email.` });
      return;
    }
    setVerifying(true);
    setMessage(null);
    const result = await verifyTwoFactorSignIn(code);
    if ("error" in result) {
      setVerifying(false);
      if (result.restart) {
        onRestart(result.error);
        return;
      }
      setCode("");
      setMessage({ type: "error", text: result.error });
      return;
    }
    const { error } = await createClient().auth.verifyOtp({ token_hash: result.tokenHash, type: "magiclink" });
    if (error) {
      setVerifying(false);
      onRestart("We couldn't finish signing you in. Please log in again.");
      return;
    }
    // Stay in the verifying state: the page is about to navigate away.
    onSignedIn();
  }

  async function handleResend() {
    setResending(true);
    setMessage(null);
    const result = await resendTwoFactorSignInCode();
    setResending(false);
    if ("error" in result) {
      if (result.restart) {
        onRestart(result.error);
        return;
      }
      setMessage({ type: "error", text: result.error });
      return;
    }
    setCode("");
    setResendIn(result.resendInSeconds);
    setMessage({ type: "success", text: `New code sent to ${maskedEmail}.` });
  }

  async function handleCancel() {
    await cancelTwoFactorSignIn();
    onRestart();
  }

  return (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MailCheck className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Two-step verification is on for this account. We sent a {TWO_FACTOR_CODE_LENGTH}-digit code to{" "}
        <span className="font-medium text-foreground">{maskedEmail}</span>.
      </p>

      {message ? (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 surface border px-3 py-2.5 text-sm",
            message.type === "error"
              ? "border-destructive/50 text-destructive"
              : "border-primary/40 bg-primary/[0.08] text-primary"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleVerify} className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="two-factor-code">Verification code</Label>
          <OneTimeCodeInput
            id="two-factor-code"
            name="code"
            required
            autoFocus
            value={code}
            onValueChange={setCode}
            disabled={verifying}
          />
          <p className="text-xs text-muted-foreground">
            The code expires in {TWO_FACTOR_CODE_TTL_MINUTES} minutes • Check spam if it isn&apos;t there
          </p>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={verifying || code.length !== TWO_FACTOR_CODE_LENGTH}>
          {verifying ? "Verifying…" : "Verify and log in"}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || verifying || resendIn > 0}
          className="font-medium text-primary underline underline-offset-4 hover:no-underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {resending ? "Sending…" : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={verifying}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground hover:no-underline disabled:cursor-not-allowed"
        >
          Use a different account
        </button>
      </div>
    </>
  );
}
