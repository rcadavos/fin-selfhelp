"use client";

import { useState } from "react";
import { Loader2, MailCheck, ShieldCheck, ShieldOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { OneTimeCodeInput } from "@/components/auth/one-time-code-input";
import { useCountdown } from "@/hooks/use-countdown";
import { confirmTwoFactorSettings, sendTwoFactorSettingsCode } from "@/actions/two-factor";
import {
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_MINUTES,
  type TwoFactorSettingsPurpose,
} from "@/lib/constants/two-factor";

type TwoFactorSettingsCardProps = {
  enabled: boolean;
  /** False for accounts that only sign in with Google (no password yet). */
  hasEmailPassword: boolean;
  /** Re-reads the user so `enabled` reflects the change. */
  onChanged: () => Promise<void>;
};

type PendingChange = { purpose: TwoFactorSettingsPurpose; maskedEmail: string };

/**
 * Turns two-step verification by email on or off. Either way the change only lands
 * once the 6-digit code emailed to the account is entered here.
 */
export function TwoFactorSettingsCard({ enabled, hasEmailPassword, onChanged }: TwoFactorSettingsCardProps) {
  const { showError, showSuccess } = useSnackbar();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resendIn, setResendIn] = useCountdown();

  async function requestCode(purpose: TwoFactorSettingsPurpose) {
    setSending(true);
    const result = await sendTwoFactorSettingsCode(purpose);
    setSending(false);
    if ("error" in result) {
      if (result.restart) {
        setPending(null);
        await onChanged();
      }
      showError(result.error);
      return;
    }
    setPending({ purpose, maskedEmail: result.maskedEmail });
    setResendIn(result.resendInSeconds);
    setCode("");
    setCodeError(null);
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    if (code.length !== TWO_FACTOR_CODE_LENGTH) {
      setCodeError(`Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from the email.`);
      return;
    }
    setConfirming(true);
    setCodeError(null);
    const result = await confirmTwoFactorSettings(pending.purpose, code);
    if ("error" in result) {
      setConfirming(false);
      setCode("");
      if (result.restart) {
        setPending(null);
        await onChanged();
        showError(result.error);
        return;
      }
      setCodeError(result.error);
      return;
    }
    await onChanged();
    setConfirming(false);
    setPending(null);
    setCode("");
    showSuccess(
      result.enabled
        ? "Two-step verification is on. We'll email you a code each time you log in with your password."
        : "Two-step verification is off."
    );
  }

  function handleCancel() {
    setPending(null);
    setCode("");
    setCodeError(null);
  }

  const turningOn = pending?.purpose === "enable";

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle id="two-factor-title" className="text-base">
              Two-step verification
            </CardTitle>
            <CardDescription>
              When you log in with your email and password, we&apos;ll also email you a {TWO_FACTOR_CODE_LENGTH}-digit
              code. Someone who learns your password still can&apos;t get in without it.
            </CardDescription>
          </div>
          <Badge variant={enabled ? "success" : "secondary"} className="mt-0.5 shrink-0">
            {enabled ? "On" : "Off"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasEmailPassword && !enabled ? (
          <div className="surface border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            You sign in with Google, which already checks it&apos;s you. Two-step verification kicks in once you set a
            password above and use it to log in.
          </div>
        ) : null}

        {pending ? (
          <form onSubmit={handleConfirm} className="space-y-4" aria-labelledby="two-factor-title">
            <div className="flex gap-3 surface border border-primary/30 bg-primary/[0.06] p-3 text-sm">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-muted-foreground">
                To {turningOn ? "turn it on" : "turn it off"}, enter the code we sent to{" "}
                <span className="font-medium text-foreground">{pending.maskedEmail}</span>. It expires in{" "}
                {TWO_FACTOR_CODE_TTL_MINUTES} minutes.
              </p>
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="two-factor-settings-code">Verification code</Label>
              <OneTimeCodeInput
                id="two-factor-settings-code"
                name="code"
                required
                autoFocus
                value={code}
                onValueChange={(value) => {
                  setCode(value);
                  setCodeError(null);
                }}
                disabled={confirming}
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? "two-factor-settings-code-error" : undefined}
              />
              {codeError ? (
                <p id="two-factor-settings-code-error" role="alert" className="text-xs text-destructive">
                  {codeError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                variant={turningOn ? "default" : "destructive"}
                disabled={confirming || code.length !== TWO_FACTOR_CODE_LENGTH}
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Confirming…
                  </>
                ) : turningOn ? (
                  "Turn on"
                ) : (
                  "Turn off"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={confirming}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => requestCode(pending.purpose)}
                disabled={sending || confirming || resendIn > 0}
              >
                {sending ? "Sending…" : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </Button>
            </div>
          </form>
        ) : enabled ? (
          <Button variant="outline" onClick={() => requestCode("disable")} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ShieldOff className="mr-2 h-4 w-4" aria-hidden />
            )}
            Turn off two-step verification
          </Button>
        ) : (
          <Button onClick={() => requestCode("enable")} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
            )}
            Turn on two-step verification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
