/** Token names match the web app's `tailwind.config.ts`; values come from `src/constants/theme.ts`. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: token("card"),
        "card-foreground": token("card-foreground"),
        popover: token("popover"),
        "popover-foreground": token("popover-foreground"),
        primary: token("primary"),
        "primary-foreground": token("primary-foreground"),
        secondary: token("secondary"),
        "secondary-foreground": token("secondary-foreground"),
        muted: token("muted"),
        "muted-foreground": token("muted-foreground"),
        accent: token("accent"),
        "accent-foreground": token("accent-foreground"),
        destructive: token("destructive"),
        "destructive-foreground": token("destructive-foreground"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        "hairline-strong": token("hairline-strong"),
        warning: token("warning"),
        "warning-foreground": token("warning-foreground"),
        success: token("success"),
        panel: token("panel"),
        "panel-foreground": token("panel-foreground"),
        "panel-muted": token("panel-muted"),
        "panel-accent": token("panel-accent"),
      },
      borderRadius: {
        lg: "6px",
        md: "4px",
        sm: "2px",
      },
    },
  },
  plugins: [],
};
