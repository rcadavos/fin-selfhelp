import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Shared "Passbook" auth chrome for /login, /signup, /forgot-password and
 * /reset-password. A split screen: a deep-green brand panel on the left (a
 * live-looking mini statement) and the form directly on the page background on
 * the right — no card chrome, no gradients, no blur blobs.
 *
 * Below the `md` breakpoint the panel collapses to a slim statement-header strip
 * (logo + one mono accessory) so brand presence never vanishes on mobile.
 */

/** OmniTrak lockup for the deep-green panel: chameleon mark + wordmark in light ink. */
function BrandLogo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold leading-none tracking-tight text-panel-accent",
        className,
      )}
    >
      <Image
        src="/favicon.png"
        alt=""
        aria-hidden
        width={80}
        height={80}
        className={cn("h-8 w-auto shrink-0 object-contain", iconClassName)}
        priority
        unoptimized
      />
      OmniTrak
    </span>
  );
}

export function AuthShell({
  stripAccessory,
  panel,
  children,
}: {
  /** Right-hand node of the mobile strip (a mono date, a trial badge, …). */
  stripAccessory?: React.ReactNode;
  /** Middle content of the desktop panel: copy + mini statement. */
  panel: React.ReactNode;
  /** The form column. */
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col md:min-h-0">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Mobile: slim statement-header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-panel-foreground/15 bg-panel px-4 py-3 text-panel-foreground md:hidden">
        <Link
          href="/"
          aria-label="OmniTrak home"
          className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent focus-visible:ring-offset-0"
        >
          <BrandLogo className="text-base" iconClassName="h-6 w-6" />
        </Link>
        {stripAccessory}
      </div>

      <div className="flex flex-1 flex-col md:grid md:grid-cols-[42fr_58fr] md:overflow-hidden">
        {/* Desktop: deep-green passbook panel */}
        <aside
          aria-label="OmniTrak"
          className="hidden flex-col justify-between overflow-y-auto bg-panel p-8 text-panel-foreground md:flex lg:p-12"
        >
          <Link
            href="/"
            aria-label="OmniTrak home"
            className="inline-flex w-fit items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent focus-visible:ring-offset-0"
          >
            <BrandLogo className="text-xl" iconClassName="h-8 w-8" />
          </Link>

          <div className="my-10">{panel}</div>

          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-panel-muted transition-colors hover:text-panel-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back to home
          </Link>
        </aside>

        {/* Form side — on the page background, no card */}
        <main
          id="auth-main"
          data-app-scroll="true"
          className="relative flex flex-1 flex-col px-4 py-14 sm:px-8 md:overflow-y-auto"
        >
          <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
            <ThemeToggle />
          </div>
          <div className="m-auto w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * The bordered mini-statement box on the panel. Head = two mono labels; children
 * are <PanelRow> ledger rows (and an optional foot).
 */
export function PanelStatement({
  title,
  meta,
  label,
  children,
}: {
  title: string;
  meta: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface border border-panel-foreground/15 bg-black/15 p-4" aria-label={label}>
      <div className="flex items-center justify-between gap-3 border-b border-panel-foreground/15 pb-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-panel-muted">{title}</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-panel-muted">{meta}</span>
      </div>
      {children}
    </div>
  );
}

/** A single ledger row inside <PanelStatement>: label, dotted leader, value. */
export function PanelRow({
  label,
  value,
  last,
  total,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Last non-total row — drops the bottom hairline. */
  last?: boolean;
  /** Running-balance / summary row — top rule, heavier weight. */
  total?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline text-sm",
        total
          ? "mt-0.5 border-t border-panel-foreground/30 pt-3 font-semibold"
          : cn("py-2.5", !last && "border-b border-panel-foreground/15")
      )}
    >
      <span className={cn("min-w-0", total ? "text-panel-foreground" : "text-panel-foreground/90")}>{label}</span>
      <span
        aria-hidden
        className="mx-2 mb-[5px] flex-1 self-end border-b border-dotted border-panel-foreground/30"
      />
      <span className="shrink-0">{value}</span>
    </div>
  );
}

/** Mono uppercase status value ("Included", "None", "Yours") for panel rows. */
export function PanelValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-panel-accent">{children}</span>
  );
}

/** Breathing-favicon loader shared by the auth loading / redirect guards. */
export function AuthLoader() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <Image
        src="/favicon.png"
        alt=""
        aria-hidden
        width={80}
        height={80}
        className="h-20 w-20 animate-breathing"
      />
    </div>
  );
}
