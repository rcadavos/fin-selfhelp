import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { OTTO_FACE_TILT_DEG, ottoSrc } from "@/lib/constants/mascot";
import s from "./otto.module.css";

/** Otto drawn still: his head alone (`face`, tilted like a curious owl's) or standing with his wings at his sides. */
export function Otto({
  pose,
  size,
  alt = "",
  className,
  priority,
}: {
  pose: "face" | "idle";
  size: number;
  /** Leave empty where he is decoration beside a label that already says what he means. */
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={ottoSrc(`otto-${pose}.svg`)}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={pose === "face" ? { transform: `rotate(${OTTO_FACE_TILT_DEG}deg)` } : undefined}
    />
  );
}

/** The loading screen: Otto's head tipping from side to side while the page loads. Decorative; the caller says "Loading". */
export function OttoLoader({ size = 80, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn(s.loader, className)}>
      <Image
        src={ottoSrc("otto-face.svg")}
        alt=""
        width={size}
        height={size}
        unoptimized
        priority
        draggable={false}
        className="select-none"
      />
    </span>
  );
}

type EyeKind = "left" | "right" | "lens";

/** One of his animated eyes, laid over a rig drawing (whose eyes are left white). */
export function OttoEye({
  kind,
  irisClassName,
  irisStyle,
  pupilClassName,
  lidClassName,
}: {
  kind: EyeKind;
  irisClassName?: string;
  irisStyle?: CSSProperties;
  pupilClassName?: string;
  lidClassName?: string;
}) {
  return (
    <div className={cn(s.eye, kind === "left" ? s.eyeL : kind === "right" ? s.eyeR : s.eyeLens)}>
      <div className={cn(s.iris, irisClassName)} style={irisStyle}>
        <div className={cn(s.pupil, pupilClassName)} />
        <div className={s.glint} />
        <div className={cn(s.glint, s.glintSmall)} />
      </div>
      <div className={cn(s.lid, lidClassName)} />
    </div>
  );
}

/** Eyes looking at you, blinking now and then (over the standing pose). */
export function OttoIdleEyes() {
  return (
    <>
      <OttoEye kind="left" irisStyle={{ transform: "translate(0, 3%)" }} />
      <OttoEye kind="right" irisStyle={{ transform: "translate(0, 3%)" }} />
    </>
  );
}

/** Searching through his lens: eyes darting, then locking on with a ping. */
export function OttoSearchEyes() {
  return (
    <>
      <OttoEye kind="left" irisClassName={s.search} pupilClassName={s.searchLock} lidClassName={s.lidSearch} />
      <OttoEye kind="lens" irisClassName={s.search} pupilClassName={s.searchLock} lidClassName={s.lidSearch} />
      <div className={s.ping} />
    </>
  );
}

type AnimatedPose = "idle" | "check" | "search" | "think" | "remind";

const RIGS: Record<AnimatedPose, string> = {
  idle: "otto-idle-rig.svg",
  check: "otto-check-rig.svg",
  search: "otto-search-rig.svg",
  think: "otto-empty-rig.svg",
  remind: "otto-remind-rig.svg",
};

/**
 * Otto in a pose with his eyes alive: `idle` blinking, `check` reading a receipt and locking on the total, `search`
 * scanning through his lens, `think` wing on his chin with his eyes wandering, `remind` ringing the bell. Square:
 * `size` in pixels. Pass `label` where he says something on his own; without it he is decoration.
 */
export function OttoAnimated({
  pose,
  size,
  label,
  className,
}: {
  pose: AnimatedPose;
  size: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(s.ot, className)}
      style={{ width: size, height: size }}
    >
      <Image src={ottoSrc(RIGS[pose])} alt="" width={size} height={size} unoptimized draggable={false} />
      {pose === "idle" && <OttoIdleEyes />}
      {pose === "remind" && (
        <>
          <OttoEye kind="left" irisStyle={{ transform: "translate(15%, -18%)" }} lidClassName={s.lidFast} />
          <OttoEye kind="right" irisStyle={{ transform: "translate(15%, -18%)" }} lidClassName={s.lidFast} />
        </>
      )}
      {pose === "check" && (
        <>
          <OttoEye kind="left" irisClassName={s.checkL} pupilClassName={s.checkLock} lidClassName={s.lidCheck} />
          <OttoEye kind="right" irisClassName={s.checkR} pupilClassName={s.checkLock} lidClassName={s.lidCheck} />
          <div className={s.reticle}>
            <span />
            <span />
            <span />
            <span />
          </div>
        </>
      )}
      {pose === "search" && <OttoSearchEyes />}
      {pose === "think" && (
        <>
          <OttoEye kind="left" irisClassName={s.ponder} lidClassName={s.lidSlow} />
          <OttoEye kind="right" irisClassName={s.ponder} lidClassName={s.lidSlow} />
          <Image
            src={ottoSrc("otto-empty-wing.svg")}
            alt=""
            width={size}
            height={size}
            unoptimized
            draggable={false}
            className={cn(s.layer, s.tap)}
          />
        </>
      )}
    </div>
  );
}
