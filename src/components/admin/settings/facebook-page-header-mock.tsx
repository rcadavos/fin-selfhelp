"use client";

import Image from "next/image";
import { Laptop, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { FACEBOOK_COVER_PHONE_SAFE_RATIO } from "@/lib/constants/social";

type FacebookPageHeaderMockProps = {
  coverSrc: string | null;
  profileSrc: string | null;
  name: string;
  /** Line under the name, e.g. "1,204 followers • Finance". */
  meta?: string;
  /** Facebook's vertical cover crop, 0–100. */
  coverOffsetY?: number;
  /** Crop the cover the way a phone shows it (16:9 from the middle). */
  phone?: boolean;
  /** Dashed lines where a phone crops the cover. */
  showPhoneGuides?: boolean;
  className?: string;
};

/** A Facebook Page's top section (cover, round profile picture, name), as visitors see it. */
export function FacebookPageHeaderMock({
  coverSrc,
  profileSrc,
  name,
  meta,
  coverOffsetY = 50,
  phone = false,
  showPhoneGuides = false,
  className,
}: FacebookPageHeaderMockProps) {
  const guideInset = `${((1 - FACEBOOK_COVER_PHONE_SAFE_RATIO) / 2) * 100}%`;

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", phone && "mx-auto w-full max-w-[360px]", className)}>
      <div className={cn("relative w-full bg-muted", phone ? "aspect-[16/9]" : "aspect-[820/312]")}>
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={`${name} cover photo`}
            fill
            unoptimized
            sizes={phone ? "360px" : "(min-width: 1024px) 820px, 100vw"}
            className="object-cover"
            style={{ objectPosition: `50% ${coverOffsetY}%` }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No cover photo</div>
        )}
        {showPhoneGuides && !phone ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-white/90 mix-blend-difference" style={{ left: guideInset }} />
            <div className="pointer-events-none absolute inset-y-0 border-r-2 border-dashed border-white/90 mix-blend-difference" style={{ right: guideInset }} />
          </>
        ) : null}
      </div>
      <div className={cn("flex items-end gap-3 px-4 pb-4", phone ? "-mt-10" : "-mt-10 sm:-mt-14 sm:px-6")}>
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted",
            phone ? "h-20 w-20" : "h-20 w-20 sm:h-28 sm:w-28",
          )}
        >
          {profileSrc ? (
            <Image src={profileSrc} alt={`${name} profile picture`} fill unoptimized sizes="112px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 pb-1">
          <p className="truncate text-lg font-bold leading-tight sm:text-xl">{name}</p>
          {meta ? <p className="truncate text-sm text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Computer • Phone switch for the header previews. */
export function DeviceToggle({ phone, onChange }: { phone: boolean; onChange: (phone: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Preview size">
      {[
        { value: false, label: "Computer", icon: Laptop },
        { value: true, label: "Phone", icon: Smartphone },
      ].map(({ value, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          aria-pressed={phone === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            phone === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
