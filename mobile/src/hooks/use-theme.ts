import { useColorScheme } from "react-native";

import { palette, type ColorScheme } from "@/constants/theme";

/** The system color scheme, with "unspecified" treated as light. */
export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

/** Raw hex colors for props that do not take a className (icons, tab bar, RefreshControl). */
export function useThemeColors() {
  return palette[useColorSchemeName()];
}
