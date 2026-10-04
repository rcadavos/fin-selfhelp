import "@/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { ThemeRoot } from "@/components/app/theme-root";
import { UserProvider, useUser } from "@/contexts/user-context";
import { queryClient } from "@/lib/query/query-client";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ThemeRoot>
          <RootNavigator />
        </ThemeRoot>
      </UserProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // The splash screen stays up until the stored session is read, so there is no signed-out flash.
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      {/* Reachable signed in or out: a sign-in link can be opened in either state. */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
