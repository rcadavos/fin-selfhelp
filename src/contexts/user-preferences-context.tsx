"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { persistUserPreferences } from "@/actions/user-preferences";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
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
  const { user, loading } = useUser();
  const { showError } = useSnackbar();
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  /** Logged-out: true after first auth resolution. Logged-in: true after fetch applies or user edits before fetch. */
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  /** When true, incoming DB fetch must not overwrite local edits (e.g. user changed settings before fetch returned). */
  const ignoreFetchRef = useRef(false);
  /** Skip one server persist right after applying prefs loaded from DB (avoids redundant POST on every page load). */
  const skipNextPersistRef = useRef(false);

  const prefsQuery = useQuery({
    ...userPreferencesQueryOptions(user?.id),
    enabled: Boolean(user?.id) && !loading,
  });

  useLayoutEffect(() => {
    const loaded = loadUserPreferences();
    setPreferencesState(loaded);
    setClientPreferenceCache(loaded);
  }, []);

  useEffect(() => {
    ignoreFetchRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const local = loadUserPreferences();
      setPreferencesState(local);
      setClientPreferenceCache(local);
      setInitialSyncDone(true);
      return;
    }

    if (prefsQuery.isPending) {
      setInitialSyncDone(false);
      return;
    }

    if (prefsQuery.isError) {
      setInitialSyncDone(true);
      return;
    }

    const prefs = prefsQuery.data;
    if (prefs === undefined) {
      setInitialSyncDone(true);
      return;
    }

    if (ignoreFetchRef.current) {
      setInitialSyncDone(true);
      return;
    }

    skipNextPersistRef.current = true;
    setPreferencesState(prefs);
    saveUserPreferences(prefs);
    setClientPreferenceCache(prefs);
    setInitialSyncDone(true);
  }, [user?.id, loading, prefsQuery.isPending, prefsQuery.isError, prefsQuery.data]);

  useEffect(() => {
    saveUserPreferences(preferences);
    setClientPreferenceCache(preferences);
  }, [preferences]);

  useEffect(() => {
    if (loading || !user || !initialSyncDone) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    void persistUserPreferences(preferences).then((r) => {
      if (r.error) showError(r.error);
    });
  }, [preferences, user, loading, initialSyncDone, showError]);

  const setPreferences = useCallback(
    (next: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => {
      ignoreFetchRef.current = true;
      if (user) setInitialSyncDone(true);
      setPreferencesState((prev) => (typeof next === "function" ? next(prev) : next));
    },
    [user]
  );

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      ignoreFetchRef.current = true;
      if (user) setInitialSyncDone(true);
      setPreferencesState((prev) => ({ ...prev, [key]: value }));
    },
    [user]
  );

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

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return ctx;
}

export function useUserPreferencesOptional(): UserPreferencesContextValue | null {
  return useContext(UserPreferencesContext);
}
