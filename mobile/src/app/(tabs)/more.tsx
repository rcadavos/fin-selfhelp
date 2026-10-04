import { Image } from "expo-image";
import { ChevronRight, ExternalLink } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Screen, ScreenSection } from "@/components/app/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/contexts/user-context";
import { useThemeColors } from "@/hooks/use-theme";
import { signOut } from "@/lib/api/auth";
import { APP_NAME, APP_VERSION, WEB_ROUTES } from "@/lib/constants/app";
import { openWebPath } from "@/lib/utils/open-web";
import { getAvatarUrl, getDisplayName } from "@/lib/utils/user";

export default function MoreScreen() {
  const { user } = useUser();
  const colors = useThemeColors();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  const handleSignOut = async () => {
    setSigningOut(true);
    // `UserProvider` clears the query cache and the root stack returns to sign-in.
    await signOut();
  };

  return (
    <Screen title="More">
      <Card className="flex-row items-center gap-4 p-4">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} accessible={false} />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Text className="text-lg font-semibold text-accent-foreground">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </Card>

      <ScreenSection title={`${APP_NAME} on the web`}>
        <Card>
          <Pressable
            accessibilityRole="link"
            onPress={() => openWebPath(WEB_ROUTES.dashboard)}
            className="flex-row items-center gap-3 p-4 active:opacity-70"
          >
            <ExternalLink color={colors.primary} size={20} />
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-medium text-foreground">Open the full app</Text>
              <Text className="text-xs text-muted-foreground">
                Bills, expenses, goals and the assistant live on the web for now.
              </Text>
            </View>
            <ChevronRight color={colors["muted-foreground"]} size={18} />
          </Pressable>
        </Card>
      </ScreenSection>

      <View className="gap-3">
        <Button label="Sign out" variant="outline" onPress={() => setConfirmingSignOut(true)} />
        <Text className="text-center text-xs text-muted-foreground">
          {APP_NAME} • version {APP_VERSION}
        </Text>
      </View>

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign out?"
        description={`You can sign back in to ${APP_NAME} with Google, an emailed link or your password.`}
        confirmLabel="Sign out"
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </Screen>
  );
}
