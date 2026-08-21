"use client";

import { useCallback, useMemo } from "react";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import {
  type AppFeatureKey,
  type AppModeId,
  DEFAULT_APP_MODE,
  isFeatureEnabledInMode,
  isRouteBlockedInMode,
} from "@/lib/constants/app-mode";

export type UseAppModeResult = {
  mode: AppModeId;
  isFullMode: boolean;
  isBillsMode: boolean;
  /** False until the stored preference has been read for the signed-in user. */
  isResolved: boolean;
  isFeatureEnabled: (feature: AppFeatureKey) => boolean;
  isRouteBlocked: (pathname: string | null | undefined) => boolean;
  setMode: (next: AppModeId) => void;
};

/**
 * The user's current app mode. Safe to call outside `UserPreferencesProvider` — it
 * falls back to the default "full" mode — so nav and shell components can use it
 * unconditionally.
 *
 * Guard route redirects on `isResolved`: until it is true the mode may still be the
 * default, and redirecting then would bounce a user off a page they can see.
 */
export function useAppMode(): UseAppModeResult {
  const ctx = useUserPreferencesOptional();
  const mode = ctx?.preferences.appMode ?? DEFAULT_APP_MODE;
  const isResolved = ctx?.isSynced ?? false;
  const updatePreference = ctx?.updatePreference;

  const isFeatureEnabled = useCallback(
    (feature: AppFeatureKey) => isFeatureEnabledInMode(mode, feature),
    [mode]
  );

  const isRouteBlocked = useCallback(
    (pathname: string | null | undefined) => isRouteBlockedInMode(mode, pathname),
    [mode]
  );

  const setMode = useCallback(
    (next: AppModeId) => updatePreference?.("appMode", next),
    [updatePreference]
  );

  return useMemo(
    () => ({
      mode,
      isFullMode: mode === "full",
      isBillsMode: mode === "bills",
      isResolved,
      isFeatureEnabled,
      isRouteBlocked,
      setMode,
    }),
    [mode, isResolved, isFeatureEnabled, isRouteBlocked, setMode]
  );
}
