import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import { useThemeColors } from "@/hooks/use-theme";
import { completeSignInWithCode } from "@/lib/api/auth";

// On web the Google popup lands here: this hands its URL back to the window that opened
// it, which finishes the sign-in. Native auth sessions return the URL directly.
const popupHandoff = WebBrowser.maybeCompleteAuthSession();

/** Where Google and magic-link sign-ins return to (`omnitrak://auth/callback?code=…`). */
export default function AuthCallbackScreen() {
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { user } = useUser();
  const colors = useThemeColors();
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const linkError = error_description ?? (code ? null : "This sign-in link is incomplete. Request a new one.");
  const error = linkError ?? exchangeError;

  useEffect(() => {
    if (popupHandoff.type === "success" || !code || error_description) return;
    let active = true;
    completeSignInWithCode(code).then((result) => {
      if (active && result.error) setExchangeError(result.error);
    });
    return () => {
      active = false;
    };
  }, [code, error_description]);

  // Once the session lands, `UserProvider` sets the user and the tabs become reachable.
  if (user) return <Redirect href="/" />;

  if (popupHandoff.type === "success") {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-sm text-muted-foreground">Signed in. You can close this window.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      {error ? (
        <>
          <Text className="text-lg font-semibold text-foreground">Couldn&apos;t sign you in</Text>
          <Text className="text-center text-sm text-muted-foreground">{error}</Text>
          <Button label="Back to sign in" variant="outline" onPress={() => router.replace("/sign-in")} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">Signing you in…</Text>
        </>
      )}
    </View>
  );
}
