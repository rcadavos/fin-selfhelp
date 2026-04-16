"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isStaleRefreshTokenError } from "@/lib/supabase/stale-session-error";
import type { User } from "@supabase/supabase-js";

type UserContextValue = {
  user: User | null;
  loading: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Single auth subscription for the app. Without this, every `useUser()` call would
 * duplicate `getSession` + `getUser()` (GET /auth/v1/user) on mount.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const hydrateLatestUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error && isStaleRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        return;
      }
      if (error) return;
      setUser(data.user ?? null);
    };

    void supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error && isStaleRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: "local" });
          setUser(null);
          setLoading(false);
          return;
        }
        if (error) {
          setUser(null);
          setLoading(false);
          return;
        }
        if (session?.user) {
          await hydrateLatestUser();
        } else {
          setUser(null);
        }
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Initial session is already handled by getSession() + hydrate above; skipping
      // avoids a duplicate GET /auth/v1/user on every load.
      if (event === "INITIAL_SESSION") return;

      if (!session?.user) {
        setUser(null);
        return;
      }
      void hydrateLatestUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
