import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MailCheck } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import {
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_MINUTES,
  type TwoFactorSettingsPurpose,
} from "@shared/two-factor";

import { OneTimeCodeInput } from "@/components/auth/one-time-code-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdown } from "@/hooks/use-countdown";
import { useThemeColors } from "@/hooks/use-theme";
import { confirmTwoFactorSettings, sendTwoFactorSettingsCode } from "@/lib/api/two-factor";
import { queryKeys } from "@/lib/query/keys";
import { twoFactorStatusQueryOptions } from "@/lib/query/two-factor";
import { cn } from "@/lib/utils/cn";

type PendingChange = { purpose: TwoFactorSettingsPurpose; maskedEmail: string };
type Feedback = { type: "error" | "success"; text: string };

/**
 * Turns two-step verification by email on or off. Either way the change only lands
 * once the 6-digit code emailed to the account is entered. Mirrors the web's
 * `src/components/account/two-factor-settings-card.tsx`.
 */
export function TwoFactorSettings() {
  const { data: status } = useSuspenseQuery(twoFactorStatusQueryOptions());
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resendIn, setResendIn] = useCountdown();

  const refetchStatus = () => queryClient.refetchQueries({ queryKey: queryKeys.twoFactorStatus() });

  const requestCode = async (purpose: TwoFactorSettingsPurpose) => {
    setSending(true);
    setFeedback(null);
    const result = await sendTwoFactorSettingsCode(purpose);
    setSending(false);
    if (!result.ok) {
      if (result.restart) {
        setPending(null);
        await refetchStatus();
      }
      setFeedback({ type: "error", text: result.error });
      return;
    }
    setPending({ purpose, maskedEmail: result.data.maskedEmail });
    setResendIn(result.data.resendInSeconds);
    setCode("");
    setCodeError(null);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    if (code.length !== TWO_FACTOR_CODE_LENGTH) {
      setCodeError(`Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from the email.`);
      return;
    }
    setConfirming(true);
    setCodeError(null);
    const result = await confirmTwoFactorSettings(pending.purpose, code);
    if (!result.ok) {
      setConfirming(false);
      setCode("");
      if (result.restart) {
        setPending(null);
        await refetchStatus();
        setFeedback({ type: "error", text: result.error });
        return;
      }
      setCodeError(result.error);
      return;
    }
    await refetchStatus();
    setConfirming(false);
    setPending(null);
    setCode("");
    setFeedback({
      type: "success",
      text: result.data.enabled
        ? "Two-step verification is on. We'll email you a code each time you sign in with your password."
        : "Two-step verification is off.",
    });
  };

  const handleCancel = () => {
    setPending(null);
    setCode("");
    setCodeError(null);
  };

  const turningOn = pending?.purpose === "enable";

  return (
    <Card className="gap-4 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-foreground">Two-step verification</Text>
          <Text className="text-sm text-muted-foreground">
            When you sign in with your email and password, we&apos;ll also email you a {TWO_FACTOR_CODE_LENGTH}-digit
            code. Someone who learns your password still can&apos;t get in without it.
          </Text>
        </View>
        <View className={cn("rounded-full px-2.5 py-0.5", status.enabled ? "bg-primary" : "bg-muted")}>
          <Text
            className={cn(
              "text-xs font-semibold",
              status.enabled ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {status.enabled ? "On" : "Off"}
          </Text>
        </View>
      </View>

      {!status.hasEmailPassword && !status.enabled ? (
        <View className="rounded-lg border border-border bg-muted p-3">
          <Text className="text-xs text-muted-foreground">
            You sign in with Google, which already checks it&apos;s you. Two-step verification kicks in once you set a
            password on the web and use it to sign in.
          </Text>
        </View>
      ) : null}

      {feedback ? (
        <Text
          className={cn("text-sm", feedback.type === "error" ? "text-destructive" : "text-primary")}
          accessibilityLiveRegion="polite"
        >
          {feedback.text}
        </Text>
      ) : null}

      {pending ? (
        <View className="gap-4">
          <View className="flex-row gap-3 rounded-lg border border-border bg-accent p-3">
            <MailCheck color={colors.primary} size={18} />
            <Text className="flex-1 text-sm text-muted-foreground">
              To {turningOn ? "turn it on" : "turn it off"}, enter the code we sent to{" "}
              <Text className="font-medium text-foreground">{pending.maskedEmail}</Text>. It expires in{" "}
              {TWO_FACTOR_CODE_TTL_MINUTES} minutes.
            </Text>
          </View>
          <View className="gap-1.5">
            <OneTimeCodeInput
              label="Verification code"
              value={code}
              onValueChange={(value) => {
                setCode(value);
                setCodeError(null);
              }}
              autoFocus
              editable={!confirming}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
            {codeError ? (
              <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
                {codeError}
              </Text>
            ) : null}
          </View>
          <Button
            label={turningOn ? "Turn on" : "Turn off"}
            variant={turningOn ? "primary" : "destructive"}
            loading={confirming}
            disabled={code.length !== TWO_FACTOR_CODE_LENGTH}
            onPress={handleConfirm}
          />
          <Button label="Cancel" variant="outline" disabled={confirming} onPress={handleCancel} />
          <Button
            label={sending ? "Sending…" : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            variant="ghost"
            disabled={sending || confirming || resendIn > 0}
            onPress={() => requestCode(pending.purpose)}
          />
        </View>
      ) : status.enabled ? (
        <Button
          label="Turn off two-step verification"
          variant="outline"
          loading={sending}
          onPress={() => requestCode("disable")}
        />
      ) : (
        <Button label="Turn on two-step verification" loading={sending} onPress={() => requestCode("enable")} />
      )}
    </Card>
  );
}

export function TwoFactorSettingsSkeleton() {
  return (
    <Card className="gap-4 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </Card>
  );
}
