import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { vars } from "nativewind";

/**
 * The web app's "passbook" palette (`src/app/globals.css`, `:root` and `.dark`) as hex.
 * This is the single source for mobile colors: `themeVars` feeds the Tailwind tokens in
 * `tailwind.config.js`, and `palette` serves props that take a raw color.
 */
const light = {
  background: "#F7F8F6",
  foreground: "#171D19",
  card: "#FCFDFB",
  "card-foreground": "#171D19",
  popover: "#FFFFFF",
  "popover-foreground": "#171D19",
  primary: "#0B6E4F",
  "primary-foreground": "#F7F8F6",
  secondary: "#ECF0ED",
  "secondary-foreground": "#171D19",
  muted: "#ECF0ED",
  "muted-foreground": "#5A6660",
  accent: "#E7EEE9",
  "accent-foreground": "#0B4C37",
  destructive: "#B3372F",
  "destructive-foreground": "#F7F8F6",
  border: "#E2E7E2",
  input: "#E2E7E2",
  ring: "#0B6E4F",
  "hairline-strong": "#C9D2CB",
  warning: "#8A6116",
  "warning-foreground": "#F7F8F6",
  success: "#0B6E4F",
  panel: "#0B2A1E",
  "panel-foreground": "#E9F0EB",
  "panel-muted": "#9FB4A8",
  "panel-accent": "#57C79A",
};

export type ThemeToken = keyof typeof light;
export type ColorScheme = "light" | "dark";

const dark: Record<ThemeToken, string> = {
  background: "#0D1310",
  foreground: "#E7ECE8",
  card: "#151C18",
  "card-foreground": "#E7ECE8",
  popover: "#1C2621",
  "popover-foreground": "#E7ECE8",
  primary: "#3BC489",
  "primary-foreground": "#0D1310",
  secondary: "#1C2621",
  "secondary-foreground": "#E7ECE8",
  muted: "#1C2621",
  "muted-foreground": "#94A29A",
  accent: "#22312A",
  "accent-foreground": "#E7ECE8",
  destructive: "#E4756C",
  "destructive-foreground": "#0D1310",
  border: "#26302A",
  input: "#26302A",
  ring: "#3BC489",
  "hairline-strong": "#37453C",
  warning: "#D9A441",
  "warning-foreground": "#0D1310",
  success: "#3BC489",
  panel: "#10201A",
  "panel-foreground": "#E7ECE8",
  "panel-muted": "#94A29A",
  "panel-accent": "#3BC489",
};

export const palette: Record<ColorScheme, Record<ThemeToken, string>> = { light, dark };

/** "#0B6E4F" → "11 110 79", the channel form `rgb(var(--x) / <alpha-value>)` expects. */
function hexToChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function cssVarsFor(colors: Record<ThemeToken, string>) {
  return vars(
    Object.fromEntries(
      Object.entries(colors).map(([token, hex]) => [`--${token}`, hexToChannels(hex)]),
    ),
  );
}

/** Apply to the root view; every `bg-primary`, `text-muted-foreground`… below resolves through it. */
export const themeVars: Record<ColorScheme, ReturnType<typeof vars>> = {
  light: cssVarsFor(light),
  dark: cssVarsFor(dark),
};

function navigationTheme(base: Theme, colors: Record<ThemeToken, string>): Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.destructive,
    },
  };
}

export const navigationThemes: Record<ColorScheme, Theme> = {
  light: navigationTheme(DefaultTheme, light),
  dark: navigationTheme(DarkTheme, dark),
};
