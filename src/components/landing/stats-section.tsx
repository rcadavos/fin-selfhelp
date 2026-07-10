"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PlatformStats {
  users: number;
  subscribers: number;
  pageVisitors: number;
}

const EMPTY_STATS: PlatformStats = { users: 0, subscribers: 0, pageVisitors: 0 };
const POLL_MS = 30_000;

function roundedEstimate(n: number): { value: number; showPlus: boolean } {
  if (n < 10) return { value: n, showPlus: false };
  if (n < 100) return { value: Math.floor(n / 10) * 10, showPlus: true };
  if (n < 1_000) return { value: Math.floor(n / 50) * 50, showPlus: true };
  if (n < 10_000) return { value: Math.floor(n / 500) * 500, showPlus: true };
  return { value: Math.floor(n / 1_000) * 1_000, showPlus: true };
}

const STAT_CARDS: { key: string; label: string; staticDisplay?: string }[] = [
  { key: "users", label: "Members" },
  { key: "subscribers", label: "Paying subscribers" },
  { key: "pageVisitors", label: "Page visitors" },
  { key: "uptime", label: "Uptime", staticDisplay: "99.9%" },
];

export function StatsSection({ className }: { className?: string }) {
  const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
  const [isLive, setIsLive] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data: PlatformStats = await res.json();
      setStats(data);
      setIsLive(true);
    } catch {
      // silently fail — stale stats stay visible
    }
  }, []);

  // Initial fetch + polling every 30 s
  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Supabase realtime — fires instantly when a new user signs up
  // (requires realtime enabled on the profiles table in your Supabase dashboard)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("platform-stats-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => fetchStats()
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [fetchStats]);

  return (
    <section
      id="platform-stats"
      className={cn("border-t border-border px-4 py-14 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow">Trusted by our community</span>
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {isLive ? "Live stats" : "Loading…"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-md border border-border sm:grid-cols-4">
          {STAT_CARDS.map(({ key, label, staticDisplay }, i) => {
            const est = staticDisplay ? null : roundedEstimate(stats[key as keyof PlatformStats] ?? 0);
            const value = staticDisplay ?? `${est!.value.toLocaleString()}${est!.showPlus ? "+" : ""}`;
            return (
              <div
                key={key}
                className={cn(
                  "border-border p-4 sm:p-5",
                  i % 2 === 1 && "border-l",
                  i >= 2 && "border-t",
                  "sm:border-t-0",
                  i === 0 ? "sm:border-l-0" : "sm:border-l"
                )}
              >
                <p className="figure text-2xl text-foreground sm:text-[1.7rem]">{value}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
