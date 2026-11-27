"use client";

import { useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { PRODUCT_NAME } from "@/lib/constants/prospect-chat";
import {
  FACEBOOK_COVER_SIZE,
  FACEBOOK_COVER_VARIANTS,
  FACEBOOK_PROFILE_SIZE,
  FACEBOOK_PROFILE_VARIANTS,
  facebookCoverSrc,
  facebookProfileSrc,
  type FacebookCoverVariant,
  type FacebookProfileVariant,
} from "@/lib/constants/social";
import { cn } from "@/lib/utils";
import { DeviceToggle, FacebookPageHeaderMock } from "./facebook-page-header-mock";

const FILE_PREFIX = PRODUCT_NAME.toLowerCase();

/** Ready-made covers and profile pictures in the brand style, previewed on a mock Page and downloadable for upload. */
export function FacebookBrandAssets() {
  const [cover, setCover] = useState<FacebookCoverVariant>(FACEBOOK_COVER_VARIANTS[0].id);
  const [profile, setProfile] = useState<FacebookProfileVariant>(FACEBOOK_PROFILE_VARIANTS[0].id);
  const [phone, setPhone] = useState(false);
  const [guides, setGuides] = useState(true);

  const coverSrc = facebookCoverSrc(cover);
  const profileSrc = facebookProfileSrc(profile);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Covers and profile pictures</CardTitle>
            <CardDescription>
              Brand-ready images at Facebook&apos;s sizes. Pick a pair, check it on a computer and a phone, then download and upload it to the Page.
            </CardDescription>
          </div>
          <DeviceToggle phone={phone} onChange={setPhone} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FacebookPageHeaderMock
          coverSrc={coverSrc}
          profileSrc={profileSrc}
          name={PRODUCT_NAME}
          meta="Finance app"
          phone={phone}
          showPhoneGuides={guides}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ToggleSwitch id="cover-phone-guides" checked={guides} onCheckedChange={setGuides} disabled={phone} />
            <Label htmlFor="cover-phone-guides" className="text-sm text-muted-foreground">
              Show what phones crop off
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <a href={coverSrc} download={`${FILE_PREFIX}-facebook-cover-${cover}.png`}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Cover • {FACEBOOK_COVER_SIZE.width} × {FACEBOOK_COVER_SIZE.height}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={profileSrc} download={`${FILE_PREFIX}-facebook-profile-${profile}.png`}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Profile • {FACEBOOK_PROFILE_SIZE} × {FACEBOOK_PROFILE_SIZE}
              </a>
            </Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Covers</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {FACEBOOK_COVER_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setCover(v.id)}
                aria-pressed={cover === v.id}
                className={cn(
                  "overflow-hidden rounded-xl border text-left transition-shadow",
                  cover === v.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border",
                )}
              >
                <div className="relative aspect-[820/312] w-full bg-muted">
                  <Image src={facebookCoverSrc(v.id)} alt={`${v.label} cover`} fill unoptimized sizes="(min-width: 640px) 400px, 100vw" className="object-cover" />
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-xs text-muted-foreground">{v.hint}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Profile pictures</h3>
          <div className="flex flex-wrap gap-4">
            {FACEBOOK_PROFILE_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setProfile(v.id)}
                aria-pressed={profile === v.id}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={cn(
                    "relative block h-24 w-24 overflow-hidden rounded-full border transition-shadow",
                    profile === v.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-1 hover:ring-border",
                  )}
                >
                  <Image src={facebookProfileSrc(v.id)} alt={`${v.label} profile picture`} fill unoptimized sizes="96px" className="object-cover" />
                </span>
                <span className="text-xs">
                  <span className="block font-medium">{v.label}</span>
                  <span className="block text-muted-foreground">{v.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">To upload:</span> on the Page, choose Edit cover photo • Upload photo, and click the profile picture • Upload photo. Then press Refresh on &ldquo;Your Page right now&rdquo; to see it live.
          </p>
          <p className="mt-1">
            Phones show only the middle of a cover, so everything that matters sits between the dashed lines.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
