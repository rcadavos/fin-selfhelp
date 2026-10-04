import { Image } from "expo-image";
import { Text, View } from "react-native";

import { APP_NAME } from "@/lib/constants/app";

/** The brand mark (the web's `public/favicon.png`) beside the product name. */
export function BrandLockup() {
  return (
    <View className="flex-row items-center gap-2" accessibilityRole="header" accessibilityLabel={APP_NAME}>
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={{ width: 40, height: 40 }}
        contentFit="contain"
        accessible={false}
      />
      <Text className="text-2xl font-bold tracking-tight text-primary">{APP_NAME}</Text>
    </View>
  );
}
