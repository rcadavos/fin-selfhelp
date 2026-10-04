import { ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { View } from "react-native";

import { navigationThemes, themeVars } from "@/constants/theme";
import { useColorSchemeName } from "@/hooks/use-theme";

/**
 * Defines the color tokens for everything below it. On web a `<Modal>` portals outside
 * the root view, so modal content needs its own `ThemeScope` to see the tokens.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  const scheme = useColorSchemeName();
  return (
    <View style={themeVars[scheme]} className="flex-1">
      {children}
    </View>
  );
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useColorSchemeName();
  return (
    <ThemeProvider value={navigationThemes[scheme]}>
      <ThemeScope>{children}</ThemeScope>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
