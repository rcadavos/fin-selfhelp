"use client";

// TEMPORARY repro harness for the account dropdown click bug. Delete after use.
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { UserContext } from "@/contexts/user-context";
import { AppShell } from "@/components/app/app-shell";
import { userIsAdminQueryOptions } from "@/lib/query/user-admin";
import {
  subscriptionCapabilitiesQueryOptions,
  subscriptionStatusQueryOptions,
} from "@/lib/query/subscription-user";

const fakeUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "test@example.com",
  user_metadata: { full_name: "Test User", onboarding_complete: true, app_avatar_url: "/favicon.png" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "",
} as unknown as User;

export default function Page() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queryClient.setQueryData(userIsAdminQueryOptions().queryKey, true as never);
    queryClient.setQueryData(subscriptionStatusQueryOptions().queryKey, { hasPremiumAccess: true, hasProAccess: true } as never);
    queryClient.setQueryData(subscriptionCapabilitiesQueryOptions().queryKey, { hasProLevelAccess: true } as never);
    setMounted(true);
  }, [queryClient]);
  if (!mounted) return null;
  return (
    <UserContext.Provider value={{ user: fakeUser, loading: false, refreshUser: async () => {} }}>
      <div className="app-layout app-layout--shell">
        <AppShell>
          <div className="container mx-auto px-4 py-8">
            {Array.from({ length: 40 }, (_, i) => (
              <p key={i}>Dashboard content row {i}</p>
            ))}
          </div>
        </AppShell>
      </div>
    </UserContext.Provider>
  );
}
