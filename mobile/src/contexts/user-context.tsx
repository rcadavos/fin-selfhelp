import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { isStaleRefreshTokenError } from "@shared/stale-session-error";

import { queryClient } from "@/lib/query/query-client";
import { supabase } from "@/lib/supabase";

type UserContextValue = {
  user: User | null;
  /** True until the stored session has been read — keep the splash screen up meanwhile. */
  loading: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

/** Single auth subscription for the app, mirroring the web's `src/contexts/user-context.tsx`. */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const applyUser = (next: User | null) => {
      const nextId = next?.id ?? null;
      // A different account must never see rows cached for the previous one.
      if (prevUserIdRef.current !== nextId) {
        queryClient.clear();
        prevUserIdRef.current = nextId;
      }
      setUser(next);
      setLoading(false);
    };

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error && isStaleRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        applyUser(null);
        return;
      }
      applyUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>.");
  return ctx;
}
