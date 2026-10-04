import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BrandLockup } from "@/components/app/brand-lockup";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, signInWithGoogle, signInWithPassword } from "@/lib/api/auth";
import { APP_NAME, WEB_ROUTES } from "@/lib/constants/app";
import { openWebPath } from "@/lib/utils/open-web";

type Mode = "password" | "link";
type Busy = "password" | "google" | "link" | null;

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const passwordRef = useRef<TextInput>(null);

  // On success `UserProvider` picks up the session and the root stack swaps to the
  // tabs, so the busy state is only cleared when the attempt did not sign in.
  const start = (next: Busy) => {
    setBusy(next);
    setError(null);
    setNotice(null);
  };

  const handlePassword = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    start("password");
    const result = await signInWithPassword(email, password);
    if (result.error) {
      setError(result.error);
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    start("google");
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
    if (result.error || result.cancelled) setBusy(null);
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    start("link");
    const result = await sendMagicLink(email);
    setBusy(null);
    if (result.error) setError(result.error);
    else setNotice(`We sent a sign-in link to ${email.trim()}. Open it on this phone.`);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-sm gap-8 self-center">
          <BrandLockup />

          <View className="gap-1">
            <Text className="text-2xl font-bold tracking-tight text-foreground">Welcome back</Text>
            <Text className="text-sm text-muted-foreground">Sign in to see your accounts and balances.</Text>
          </View>

          <View className="gap-4">
            <Button
              label="Continue with Google"
              variant="outline"
              icon={<GoogleMark />}
              loading={busy === "google"}
              disabled={busy !== null}
              onPress={handleGoogle}
            />

            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs text-muted-foreground">or</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType={mode === "password" ? "next" : "send"}
              submitBehavior={mode === "password" ? "submit" : "blurAndSubmit"}
              onSubmitEditing={mode === "password" ? () => passwordRef.current?.focus() : handleMagicLink}
            />

            {mode === "password" ? (
              <Input
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handlePassword}
              />
            ) : null}

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

            {mode === "password" ? (
              <>
                <Button
                  label="Sign in"
                  loading={busy === "password"}
                  disabled={busy !== null}
                  onPress={handlePassword}
                />
                <Button
                  label="Email me a sign-in link instead"
                  variant="ghost"
                  disabled={busy !== null}
                  onPress={() => switchMode("link")}
                />
              </>
            ) : (
              <>
                <Button
                  label={notice ? "Send the link again" : "Email me a sign-in link"}
                  loading={busy === "link"}
                  disabled={busy !== null}
                  onPress={handleMagicLink}
                />
                <Button
                  label="Use my password instead"
                  variant="ghost"
                  disabled={busy !== null}
                  onPress={() => switchMode("password")}
                />
              </>
            )}
          </View>

          <View className="items-center gap-3">
            {mode === "password" ? (
              <Pressable accessibilityRole="link" onPress={() => openWebPath(WEB_ROUTES.forgotPassword)} hitSlop={8}>
                <Text className="text-sm font-medium text-primary">Forgot password?</Text>
              </Pressable>
            ) : null}
            <Text className="text-sm text-muted-foreground">
              New to {APP_NAME}?{" "}
              <Text
                accessibilityRole="link"
                className="font-medium text-primary"
                onPress={() => openWebPath(WEB_ROUTES.signup)}
              >
                Create an account
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
