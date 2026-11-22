"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  OTTO_LANDING_CELL_RATIO,
  OTTO_LANDING_FRAMES,
  OTTO_LANDING_STRIPS,
  OTTO_TILT_FRAMES,
  OTTO_TURN_FRAMES,
  ottoSrc,
} from "@/lib/constants/mascot";
import { OttoIdleEyes, OttoSearchEyes } from "./otto";
import s from "./otto.module.css";

/** What he does once he has landed. */
export type OttoLandingPose = "idle" | "curious" | "turn" | "remind" | "check" | "search";

const STRIP: Record<OttoLandingPose, string> = {
  idle: OTTO_LANDING_STRIPS.idle,
  curious: OTTO_LANDING_STRIPS.idle,
  turn: OTTO_LANDING_STRIPS.turn,
  remind: OTTO_LANDING_STRIPS.remind,
  check: OTTO_LANDING_STRIPS.check,
  search: OTTO_LANDING_STRIPS.search,
};

/**
 * Otto flies in and lands on the card he sits on: one owl from start to finish, a single strip of frames (flapping on
 * the way down, then his wings folding to the pose), so no drawing is ever swapped for another mid-flight. He lands
 * when the card comes into view; until then the spot is empty, so he never shows up twice.
 *
 * Place him inside a `relative` card wrapper: he stands on its top edge, feet overlapping it a little. Position him
 * across with `className` (`right-[6%]`); `size` is his box in pixels, overridable per breakpoint with
 * `max-sm:![--otto:140px]`. After landing: `idle` blinks, `curious` tilts his head with a "?" every 5 s, `turn` turns
 * his head right round now and then, `search` scans through his lens; `remind` and `check` hold their pose.
 */
export function OttoLanding({
  pose,
  size,
  from = "right",
  label,
  className,
}: {
  pose: OttoLandingPose;
  size: number;
  from?: "left" | "right";
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setLanded(true);
      return;
    }
    // Hidden from here until he lands, so the card never shows him sitting before he flies in.
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLanded(true);
          io.disconnect();
        }
      },
      // Lands once the card is a little way into view, so the flight is seen.
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stripWidth = Math.round(size * OTTO_LANDING_CELL_RATIO * OTTO_LANDING_FRAMES);
  const swap = pose === "curious" || pose === "turn";

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        s.land,
        from === "left" ? s.fromLeft : s.fromRight,
        armed && s.armed,
        landed && s.landed,
        swap && s.swap,
        className,
      )}
      style={{ "--otto-size": `${size}px` } as CSSProperties}
    >
      <div className={s.strip}>
        <Image src={ottoSrc(STRIP[pose])} alt="" width={stripWidth} height={size} unoptimized draggable={false} />
      </div>
      {pose === "idle" && (
        <div className={s.after}>
          <OttoIdleEyes />
        </div>
      )}
      {pose === "search" && (
        <div className={s.after}>
          <OttoSearchEyes />
        </div>
      )}
      {pose === "turn" && (
        <div className={s.after}>
          <div className={s.spin}>
            <Image
              src={ottoSrc("otto-turn-strip.svg")}
              alt=""
              width={size * OTTO_TURN_FRAMES}
              height={size}
              unoptimized
              draggable={false}
            />
          </div>
        </div>
      )}
      {pose === "curious" && (
        <div className={s.after}>
          <div className={s.tilt}>
            <Image
              src={ottoSrc("otto-tilt-strip.svg")}
              alt=""
              width={size * OTTO_TILT_FRAMES}
              height={size}
              unoptimized
              draggable={false}
            />
          </div>
          <Image
            src={ottoSrc("otto-qmark.svg")}
            alt=""
            width={size}
            height={size}
            unoptimized
            draggable={false}
            className={cn(s.layer, s.qmark)}
          />
        </div>
      )}
    </div>
  );
}
