"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isStaleRefreshTokenError } from "@/lib/supabase/stale-session-error";
import type { User } from "@supabase/supabase-js";

export function useUser() {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      void hydrateLatestUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
