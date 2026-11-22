"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { START_COST_DISPLAY, TRIAL_CTA_LABEL } from "@/lib/constants/landing";

/**
 * The home page's call-to-action button. Styling lives in globals.css (`.cta`):
 * money green with a soft glow that lifts on hover, an arrow that nudges forward,
 * and optionally a ticket stub on the right, torn off along a dashed perforation,
 * that prints what signing up costs.
 *
 * `tone="panel"` is for the dark brand panel, where the ink green has too little
 * contrast against the background.
 */
type CtaTone = "ink" | "panel";
type CtaSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<CtaSize, string> = {
  sm: "h-9 text-sm [--cta-px:0.875rem]",
  md: "h-11 text-[15px]",
  lg: "h-12 text-[15px] lg:h-[3.25rem] lg:text-base",
};

export function CtaButton({
  href,
  children,
  tone = "ink",
  size = "md",
  stub,
  arrow = true,
  pending = false,
  onClick,
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: CtaTone;
  size?: CtaSize;
  /** Content of the ticket stub, e.g. <CtaCostStub />. */
  stub?: ReactNode;
  arrow?: boolean;
  /** Shows a spinner over the label and stops the button taking clicks. */
  pending?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  const classes = cn("cta", tone === "panel" && "cta-panel", stub != null && "cta-has-stub", SIZE_CLASS[size], className);
  const body = (
    <span className="cta-body">
      <span className="cta-label">
        {/* While pending, the label stays in place (invisible) so the button keeps its size. */}
        <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>
          {children}
          {arrow && <ArrowRight className="cta-arrow size-4" aria-hidden />}
        </span>
        {pending && <Loader2 className="absolute size-4 animate-spin" aria-hidden />}
      </span>
      {stub != null && <span className="cta-stub">{stub}</span>}
    </span>
  );

  if (pending) {
    return (
      <span className={classes} aria-disabled="true" aria-busy="true" role="link">
        {body}
      </span>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={classes}>
      {body}
    </Link>
  );
}

/** Ticket stub that says signing up costs nothing today. */
export function CtaCostStub() {
  return (
    <>
      <Amount formatted={START_COST_DISPLAY} className="text-[15px] font-semibold leading-none" />
      <span className="font-mono text-[9px] font-medium uppercase leading-none tracking-[0.12em] opacity-80">
        today
      </span>
    </>
  );
}

/**
 * The main sign-up CTA, aware of who is looking: a visitor gets the free-trial
 * button with its ₱0 stub, a signed-in user gets "Go to Dashboard". Spins while
 * the session loads and after a click, until the next page takes over.
 * `showCost={false}` drops the stub where the price is already printed beside it.
 */
export function AuthCtaButton({
  tone = "ink",
  size = "lg",
  showCost = true,
  className,
}: {
  tone?: CtaTone;
  size?: CtaSize;
  showCost?: boolean;
  className?: string;
}) {
  const { user, loading } = useUser();
  const [navigating, setNavigating] = useState(false);
  const signedIn = !loading && !!user;

  return (
    <CtaButton
      href={signedIn ? "/dashboard" : "/signup"}
      tone={tone}
      size={size}
      stub={signedIn || !showCost ? undefined : <CtaCostStub />}
      pending={loading || navigating}
      onClick={(e) => {
        // A click that opens a new tab leaves this page in place, so no spinner.
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) setNavigating(true);
      }}
      className={className}
    >
      {signedIn ? "Go to Dashboard" : TRIAL_CTA_LABEL}
    </CtaButton>
  );
}
