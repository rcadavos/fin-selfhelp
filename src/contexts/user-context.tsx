"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isStaleRefreshTokenError } from "@/lib/supabase/stale-session-error";
import { getQueryClient } from "@/lib/query/query-client";
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
  const avatarSyncInFlightRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const ensureAppAvatarFromProvider = async (nextUser: User | null) => {
      if (!nextUser || avatarSyncInFlightRef.current) return;
      const meta = (nextUser.user_metadata ?? {}) as Record<string, unknown>;
      const appAvatar = typeof meta.app_avatar_url === "string" ? meta.app_avatar_url.trim() : "";
      if (appAvatar) return;
      const providerAvatar =
        (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
        (typeof meta.picture === "string" && meta.picture.trim()) ||
        (typeof meta.image === "string" && meta.image.trim()) ||
        "";
      if (!providerAvatar) return;
      avatarSyncInFlightRef.current = true;
      const { error } = await supabase.auth.updateUser({
        data: { app_avatar_url: providerAvatar },
      });
      avatarSyncInFlightRef.current = false;
      if (!error) {
        setUser((current) =>
          current
            ? {
                ...current,
                user_metadata: {
                  ...(current.user_metadata ?? {}),
                  app_avatar_url: providerAvatar,
                },
              }
            : current
        );
      }
    };

    const hydrateLatestUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error && isStaleRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
        getQueryClient().clear();
        prevUserIdRef.current = null;
        setUser(null);
        return;
      }
      if (error) return;
      const nextUser = data.user ?? null;
      if (nextUser?.id !== prevUserIdRef.current) {
        getQueryClient().clear();
        prevUserIdRef.current = nextUser?.id ?? null;
      }
      setUser(nextUser);
      await ensureAppAvatarFromProvider(nextUser);
    };

    void supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error && isStaleRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: "local" });
          getQueryClient().clear();
          prevUserIdRef.current = null;
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
        getQueryClient().clear();
        prevUserIdRef.current = null;
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
