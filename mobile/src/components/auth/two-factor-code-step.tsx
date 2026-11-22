import { useState } from "react";
import { Text, View } from "react-native";

import {
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_MINUTES,
  type TwoFactorSignInChallenge,
} from "@shared/two-factor";

import { OneTimeCodeInput } from "@/components/auth/one-time-code-input";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { completeTwoFactorSignIn, resendTwoFactorSignInCode } from "@/lib/api/auth";

type TwoFactorCodeStepProps = {
  challenge: TwoFactorSignInChallenge;
  /** Back to the password form, with an optional error to show there. */
  onRestart: (error?: string) => void;
};

/** Second step of a password sign-in for an account with two-step verification on. */
export function TwoFactorCodeStep({ challenge, onRestart }: TwoFactorCodeStepProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useCountdown(challenge.resendInSeconds);

  const handleVerify = async () => {
    if (code.length !== TWO_FACTOR_CODE_LENGTH) {
      setError(`Enter the ${TWO_FACTOR_CODE_LENGTH}-digit code from the email.`);
      return;
    }
    setVerifying(true);
    setError(null);
    setNotice(null);
    const result = await completeTwoFactorSignIn(challenge.challengeId, code);
    if (result.error) {
      setVerifying(false);
      if (result.restart) {
        onRestart(result.error);
        return;
      }
      setCode("");
      setError(result.error);
    }
    // On success `UserProvider` picks up the session and the root stack swaps to the
    // tabs, so the verifying state is left on.
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    const result = await resendTwoFactorSignInCode(challenge.challengeId);
    setResending(false);
    if (!result.ok) {
      if (result.restart) {
        onRestart(result.error);
        return;
      }
      setError(result.error);
      return;
    }
    setCode("");
    setResendIn(result.data.resendInSeconds);
    setNotice(`New code sent to ${challenge.maskedEmail}.`);
  };

  return (
    <View className="gap-6">
      <View className="gap-1">
        <Text className="text-2xl font-bold tracking-tight text-foreground">Check your email</Text>
        <Text className="text-sm text-muted-foreground">
          Two-step verification is on for this account. We sent a {TWO_FACTOR_CODE_LENGTH}-digit code to{" "}
          <Text className="font-medium text-foreground">{challenge.maskedEmail}</Text>.
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-1.5">
          <OneTimeCodeInput
            label="Verification code"
            value={code}
            onValueChange={(value) => {
              setCode(value);
              setError(null);
            }}
            autoFocus
            editable={!verifying}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
          <Text className="text-xs text-muted-foreground">
            Expires in {TWO_FACTOR_CODE_TTL_MINUTES} minutes • Check spam if it isn&apos;t there
          </Text>
        </View>

        {error ? (
          <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text className="text-sm text-primary" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        <Button
          label="Verify and sign in"
          loading={verifying}
          disabled={code.length !== TWO_FACTOR_CODE_LENGTH}
          onPress={handleVerify}
        />
        <Button
          label={resending ? "Sending…" : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          variant="ghost"
          disabled={resending || verifying || resendIn > 0}
          onPress={handleResend}
        />
        <Button
          label="Use a different account"
          variant="ghost"
          disabled={verifying}
          onPress={() => onRestart()}
        />
      </View>
    </View>
  );
}
