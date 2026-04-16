import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DashboardSkeletonVariant =
  | "dashboard"
  | "expenses"
  | "my-goals"
  | "calculators-index"
  | "calculator-detail"
  | "to-buy-list";

function Shell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full min-w-0", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
      <div className="absolute -right-11 -top-11 h-48 w-48 rounded-full bg-white/10 sm:h-52 sm:w-52" aria-hidden />
      <div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full bg-white/5 sm:h-36 sm:w-36" aria-hidden />
      <div className="relative flex items-start">
        <div className="min-w-0 flex-1 space-y-2.5 pr-32 sm:pr-36">
          <div className="inline-flex items-center gap-1 rounded-md border border-emerald-200/35 bg-emerald-300/10 p-0.5">
            <Skeleton className="h-7 w-16 rounded-sm bg-primary-foreground/25" />
            <Skeleton className="h-7 w-20 rounded-sm bg-primary-foreground/20" />
            <Skeleton className="h-7 w-16 rounded-sm bg-primary-foreground/20" />
          </div>
          <Skeleton className="h-4 w-44 bg-primary-foreground/25 sm:w-52" />
          <Skeleton className="h-4 w-20 bg-primary-foreground/20" />
          <Skeleton className="h-12 w-52 max-w-full bg-primary-foreground/25 sm:h-14" />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Skeleton className="h-6 w-40 rounded-full bg-primary-foreground/20" />
            <Skeleton className="h-6 w-24 rounded-full bg-primary-foreground/20" />
          </div>
        </div>
        <Skeleton className="absolute right-6 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-primary-foreground/25" />
      </div>
      <div className="mt-6 space-y-2">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-3 w-28 bg-primary-foreground/15" />
          <Skeleton className="h-3 w-32 bg-primary-foreground/15" />
        </div>
        <Skeleton className="h-3 w-full rounded-full bg-primary-foreground/20" />
      </div>
    </div>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <Skeleton className="mb-2 h-9 w-9 rounded-lg" />
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return <div className="mb-6 overflow-hidden rounded-xl border bg-card shadow-sm">{children}</div>;
}

/** Matches My Expenses “this month” green summary card (compact). */
function MyExpensesHeroSkeleton() {
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-4 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 sm:h-36 sm:w-36" aria-hidden />
      <div className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-white/5 sm:h-24 sm:w-24" aria-hidden />
      <div className="relative flex flex-row items-start justify-between gap-3 sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-48 bg-primary-foreground/25 sm:h-4 sm:w-52" />
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1">
            <Skeleton className="h-3.5 w-[5rem] bg-primary-foreground/20 sm:h-4" />
            <Skeleton className="h-3.5 w-[5rem] bg-primary-foreground/20 sm:h-4" />
            <Skeleton className="h-3.5 w-[5rem] bg-primary-foreground/20 sm:h-4" />
          </div>
        </div>
        <Skeleton className="h-20 w-20 shrink-0 rounded-full bg-primary-foreground/25" />
      </div>
      <div className="relative mt-4 space-y-1">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-2.5 w-24 bg-primary-foreground/20 sm:h-3 sm:w-28" />
          <Skeleton className="h-2.5 w-28 bg-primary-foreground/20 sm:h-3 sm:w-32" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full bg-primary-foreground/25" />
      </div>
    </div>
  );
}

function MyExpensesCategoryRowSkeleton() {
  return (
    <div className="space-y-1.5 py-2.5 first:pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="h-4 w-[min(100%,18rem)] max-w-full" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </div>
        <Skeleton className="h-5 w-20 shrink-0" />
      </div>
      <Skeleton className="h-3 w-52 max-w-full" />
    </div>
  );
}

/** “Expenses” heading + categorized toggle + category cards + Add expense. */
function MyExpensesCategorySectionSkeleton() {
  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-row items-start justify-between gap-3 sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Skeleton className="h-7 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex shrink-0 flex-row items-center justify-end gap-2 pt-0.5">
          <Skeleton className="h-9 w-14 rounded-md sm:w-24" />
          <Skeleton className="h-9 w-14 rounded-md sm:w-28" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Skeleton className="h-1.5 flex-1 rounded-full bg-muted/80" />
            <Skeleton className="h-3 w-7" />
          </div>
        </div>
        <div className="divide-y divide-border/50 px-4">
          <MyExpensesCategoryRowSkeleton />
        </div>
        <div className="px-4 pb-4 pt-1">
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** “Add expense” bulk card. */
function MyExpensesAddCardSkeleton() {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="p-6 pb-4">
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full max-w-lg" />
            <Skeleton className="h-3 w-[85%] max-w-md" />
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Skeleton className="h-14 w-[140px] rounded-md" />
            <Skeleton className="h-14 min-w-[8rem] flex-1 rounded-md" />
            <Skeleton className="h-14 w-20 rounded-md" />
            <Skeleton className="h-14 w-[130px] rounded-md" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function DashboardHomeBody() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-4">
      <HeroSkeleton />
      <StatCardsSkeleton />
      <CardShell>
        <div className="p-4 pb-2">
          <Skeleton className="mb-1 h-5 w-64" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <div className="flex h-32 items-end justify-between gap-2 px-4 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-16 w-full max-w-10 rounded-t-md" />
              <Skeleton className="h-2 w-6" />
            </div>
          ))}
        </div>
      </CardShell>
      <div className="rounded-xl border border-primary/20 bg-muted/20 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="h-10 w-44 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ExpensesBody() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>
      <MyExpensesHeroSkeleton />
      <MyExpensesCategorySectionSkeleton />
      <MyExpensesAddCardSkeleton />
    </div>
  );
}

function CalculatorsIndexBody() {
  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl px-4 pb-8 pt-4">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-full max-w-lg" />
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-44" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-[92%]" />
            <Skeleton className="mt-1 h-3 w-[78%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalculatorDetailBody() {
  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl px-4 pb-8 pt-4">
      <Skeleton className="mb-6 h-4 w-28" />
      <Skeleton className="mb-2 h-8 w-72 max-w-full" />
      <Skeleton className="mb-6 h-4 w-full max-w-xl" />
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-6">
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="space-y-4 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-md sm:w-40" />
        </div>
      </div>
    </div>
  );
}

function MyGoalsBody() {
  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10 pt-4">
      <div className="mb-8 flex items-start gap-3">
        <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-3 w-56" />
            <Skeleton className="mt-2 h-3 w-44" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToBuyListBody() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6">
      <div className="mb-8 flex items-start gap-3">
        <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
      </div>
      <ul className="divide-y divide-border/70">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[min(100%,20rem)]" />
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center gap-3 border-t border-border/70 pt-4">
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-none border-b-2 border-muted/50" />
      </div>
    </div>
  );
}

type DashboardSkeletonProps = {
  variant: DashboardSkeletonVariant;
  className?: string;
};

export function DashboardSkeleton({ variant, className }: DashboardSkeletonProps) {
  const body =
    variant === "dashboard" ? (
      <DashboardHomeBody />
    ) : variant === "expenses" ? (
      <ExpensesBody />
    ) : variant === "my-goals" ? (
      <MyGoalsBody />
    ) : variant === "calculators-index" ? (
      <CalculatorsIndexBody />
    ) : variant === "calculator-detail" ? (
      <CalculatorDetailBody />
    ) : (
      <ToBuyListBody />
    );

  return <Shell className={className}>{body}</Shell>;
}
