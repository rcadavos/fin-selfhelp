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
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
