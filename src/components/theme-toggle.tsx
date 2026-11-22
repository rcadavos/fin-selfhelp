"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { TOP_BAR_ICON_BUTTON, type TopBarIconButtonSize } from "@/lib/constants/top-bar";

export function ThemeToggle({ size = "default" }: { size?: TopBarIconButtonSize }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sizing = TOP_BAR_ICON_BUTTON[size];

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={sizing.button} aria-label="Toggle theme">
        <Sun className={sizing.icon} />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={sizing.button}
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className={sizing.icon} />
      ) : (
        <Moon className={sizing.icon} />
      )}
    </Button>
  );
}
