import Link from "next/link";
import { Header } from "@/components/landing/header";
import { CHANGELOG, type ChangeType } from "@/lib/changelog";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";
import { ScrollText, Zap, Wrench, Flame, TrendingUp } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Changelog",
  description: "Release notes, bug fixes, and new features for OmniTrak.",
  path: "/changelog",
});

const TYPE_CONFIG: Record<
  ChangeType,
  { label: string; icon: React.ElementType; className: string }
> = {
  feature: {
    label: "Feature",
    icon: Zap,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  improvement: {
    label: "Improvement",
    icon: TrendingUp,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  fix: {
    label: "Fix",
    icon: Wrench,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  hotfix: {
    label: "Hotfix",
    icon: Flame,
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-0 flex-1 bg-background">
      <Header />
      <main>
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>

          {/* Header */}
          <div className="mb-10 mt-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Changelog</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Release notes, bug fixes, and new features — current version{" "}
                <span className="font-semibold text-foreground">v{APP_VERSION}</span>
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-8 flex flex-wrap gap-2">
            {(
              Object.entries(TYPE_CONFIG) as [ChangeType, (typeof TYPE_CONFIG)[ChangeType]][]
            ).map(([, cfg]) => {
              const Icon = cfg.icon;
              return (
                <span
                  key={cfg.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    cfg.className
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />

            <div className="flex flex-col gap-10">
              {CHANGELOG.map((entry) => (
                <div key={entry.version} className="relative pl-8">
                  <div
                    className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background"
                    aria-hidden
                  />

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-lg font-bold text-foreground">v{entry.version}</h2>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>

                  {entry.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
                  )}

                  <ul className="mt-4 flex flex-col gap-2">
                    {entry.changes.map((change, i) => {
                      const cfg = TYPE_CONFIG[change.type];
                      const Icon = cfg.icon;
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex w-24 shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              cfg.className
                            )}
                          >
                            <Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </span>
                          <span className="text-sm text-foreground">{change.description}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
