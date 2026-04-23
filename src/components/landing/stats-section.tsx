"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, ReceiptText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PlatformStats {
  users: number;
  billsTracked: number;
  paymentsMade: number;
  goalsSet: number;
}

const EMPTY_STATS: PlatformStats = { users: 0, billsTracked: 0, paymentsMade: 0, goalsSet: 0 };
const POLL_MS = 30_000;

function AnimatedNumber({ target, isVisible }: { target: number; isVisible: boolean }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) return;
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    const duration = 1800;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, isVisible]);

  return <>{display.toLocaleString()}</>;
}

const STAT_CARDS: {
  key: string;
  label: string;
  description: string;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  numColor: string;
  staticDisplay?: string;
}[] = [
  {
    key: "users",
    label: "Members",
    description: "People already tracking their finances",
    icon: Users,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    numColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "billsTracked",
    label: "Expenses logged",
    description: "Expense and bill entries tracked across all members",
    icon: ReceiptText,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    numColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "paymentsMade",
    label: "Bills paid",
    description: "Bills marked as paid by our members",
    icon: CheckCircle2,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    numColor: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "uptime",
    label: "Uptime",
    description: "Platform availability over the last 90 days",
    icon: Activity,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    numColor: "text-amber-600 dark:text-amber-400",
    staticDisplay: "99.9%",
  },
];

export function StatsSection({ className }: { className?: string }) {
  const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
  const [isVisible, setIsVisible] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  // Trigger animation when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
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
      ref={sectionRef}
      id="platform-stats"
      className={cn(
        "border-t bg-gradient-to-b from-muted/30 to-background px-4 py-16 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  isLive ? "animate-ping bg-emerald-500" : "bg-border"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  isLive ? "bg-emerald-500" : "bg-border"
                )}
              />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {isLive ? "Live stats" : "Loading…"}
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by our community
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Real numbers from real people using the platform to take control of their finances every
            day.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, label, description, icon: Icon, iconBg, iconColor, numColor, staticDisplay }) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              {/* Subtle glow on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-primary/20 transition-opacity group-hover:opacity-100" />

              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                  iconBg
                )}
              >
                <Icon className={cn("h-5 w-5", iconColor)} aria-hidden />
              </div>

              {staticDisplay ? (
                <p className={cn("text-4xl font-bold tabular-nums tracking-tight", numColor)}>
                  {staticDisplay}
                </p>
              ) : (
                <p className={cn("text-4xl font-bold tabular-nums tracking-tight", numColor)}>
                  <AnimatedNumber target={stats[key as keyof PlatformStats] ?? 0} isVisible={isVisible} />
                  <span className="ml-0.5 text-2xl opacity-60">+</span>
                </p>
              )}

              <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
