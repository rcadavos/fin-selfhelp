"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { Otto } from "@/components/mascot/otto";
import { ASSISTANT_NAME, MASCOT_NAME } from "@/lib/constants/mascot";
import {
  ASK_OTTO_DEMO,
  ASK_OTTO_DEMO_INITIAL,
  ASK_OTTO_DEMO_TYPING_MS,
  type AskOttoDemoSegment,
} from "@/lib/constants/landing";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * The Ask Otto card, as a demo: pick one of the sample questions and Otto types
 * out its answer. The chat always holds the last two exchanges, so the card keeps
 * roughly the same height whichever question is asked.
 */
export function AskOttoDemo() {
  const [shown, setShown] = useState<readonly [number, number]>(ASK_OTTO_DEMO_INITIAL);
  const [typing, setTyping] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const latest = shown[1];

  const ask = (index: number) => {
    if (index === latest) return;
    setShown([latest, index]);
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) {
      setTyping(false);
      return;
    }
    setTyping(true);
    timer.current = window.setTimeout(() => setTyping(false), ASK_OTTO_DEMO_TYPING_MS);
  };

  return (
    <div className="relative z-[1] grid overflow-hidden surface border border-border bg-card lg:grid-cols-11">
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8 lg:col-span-5">
        <h3 className="text-xl font-bold tracking-tight text-foreground">{ASSISTANT_NAME}</h3>
        <p className="max-w-[40ch] text-muted-foreground">
          A private AI assistant that reads your ledger, not your bank. Ask about spending, due
          dates, or your own uploaded documents.
        </p>
        <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
          Included with Pro and Premium
        </span>

        <div className="mt-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Try asking</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ASK_OTTO_DEMO.map((exchange, i) => (
              <button
                key={exchange.question}
                type="button"
                onClick={() => ask(i)}
                aria-pressed={i === latest}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-left text-[13px] leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                  i === latest
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-hairline-strong text-muted-foreground hover:border-primary hover:text-foreground"
                )}
              >
                {exchange.question}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 border-t border-border bg-background p-6 sm:p-8 lg:col-span-6 lg:justify-end lg:border-l lg:border-t-0"
        aria-label="Sample assistant conversation"
        aria-live="polite"
      >
        {shown.map((index, slot) => {
          const exchange = ASK_OTTO_DEMO[index];
          const isNewest = slot === 1;
          return (
            // Keyed by question, so a newly asked one mounts (and fades in) fresh.
            <div key={`${slot}-${index}`} className="flex flex-col gap-3">
              <p
                className={cn(
                  "max-w-[85%] self-end surface bg-primary px-3.5 py-2.5 text-sm text-primary-foreground",
                  isNewest && "animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
                )}
              >
                {exchange.question}
              </p>
              <div className="flex max-w-[90%] items-end gap-2.5 self-start">
                <Otto pose="face" size={34} alt={MASCOT_NAME} />
                {isNewest && typing ? (
                  <p className="surface flex h-10 items-center gap-1 border border-border bg-card px-3.5">
                    <span className="sr-only">{MASCOT_NAME} is typing</span>
                    <TypingDot delay="0ms" />
                    <TypingDot delay="150ms" />
                    <TypingDot delay="300ms" />
                  </p>
                ) : (
                  <p
                    className={cn(
                      "surface border border-border bg-card px-3.5 py-2.5 text-sm text-foreground",
                      isNewest && "animate-in fade-in motion-reduce:animate-none"
                    )}
                  >
                    <Answer segments={exchange.answer} />
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Answer({ segments }: { segments: readonly AskOttoDemoSegment[] }) {
  return (
    <>
      {segments.map((segment, i) =>
        typeof segment === "string" ? (
          <span key={i}>{segment}</span>
        ) : (
          <Amount key={i} formatted={segment.amount} className="text-sm" />
        )
      )}
    </>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}
