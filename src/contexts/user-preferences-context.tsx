"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type UserPreferences,
  DEFAULT_USER_PREFERENCES,
  loadUserPreferences,
  saveUserPreferences,
  setClientPreferenceCache,
  formatCurrencyWithPreferences,
  formatDateWithPreferences,
  formatTimeWithPreferences,
  formatNumberWithPreferences,
} from "@/lib/user-preferences";

type UserPreferencesContextValue = {
  preferences: UserPreferences;
  setPreferences: (next: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  formatCurrency: (amount: number, currencyOverride?: string) => string;
  formatDate: (input: Date | string) => string;
  formatTime: (input: Date | string) => string;
  formatNumber: (n: number) => string;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);

  useLayoutEffect(() => {
    const loaded = loadUserPreferences();
    setPreferencesState(loaded);
    setClientPreferenceCache(loaded);
  }, []);

  const setPreferences = useCallback(
    (next: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => {
      setPreferencesState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        saveUserPreferences(resolved);
        return resolved;
      });
    },
    []
  );

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, [setPreferences]);

  const formatCurrency = useCallback(
    (amount: number, currencyOverride?: string) =>
      formatCurrencyWithPreferences(amount, {
        ...preferences,
        currency: currencyOverride ?? preferences.currency,
      }),
    [preferences]
  );

  const formatDate = useCallback(
    (input: Date | string) => formatDateWithPreferences(input, preferences),
    [preferences]
  );

  const formatTime = useCallback(
    (input: Date | string) => formatTimeWithPreferences(input, preferences),
    [preferences]
  );

  const formatNumber = useCallback(
    (n: number) => formatNumberWithPreferences(n, preferences),
    [preferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      setPreferences,
      updatePreference,
      formatCurrency,
      formatDate,
      formatTime,
      formatNumber,
    }),
    [preferences, setPreferences, updatePreference, formatCurrency, formatDate, formatTime, formatNumber]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return ctx;
}

/** Safe for optional usage (e.g. future server boundaries); returns null outside provider. */
export function useUserPreferencesOptional(): UserPreferencesContextValue | null {
  return useContext(UserPreferencesContext);
}
