"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createSocialImageUpload } from "@/actions/social";
import { SOCIAL_IMAGE_BUCKET, SOCIAL_IMAGE_MAX_BYTES, SOCIAL_IMAGE_MIME_TYPES } from "@/lib/constants/social";
import { validateSocialImageFile } from "@/lib/social/images";
import { cn } from "@/lib/utils";

const ACCEPT = SOCIAL_IMAGE_MIME_TYPES.join(",");
const MAX_MB = Math.round(SOCIAL_IMAGE_MAX_BYTES / (1024 * 1024));

/**
 * Picks or drops a photo and uploads it straight to Storage through a one-time
 * signed address. Reports the photo's public address, which Facebook fetches when
 * the post goes out.
 */
export function SocialImageUpload({
  id,
  value,
  onChange,
  onUploaded,
  disabled,
}: {
  id: string;
  /** Public address of the current photo, or empty. */
  value: string;
  onChange: (url: string) => void;
  /** Every finished upload, so the composer can drop the ones no post keeps. */
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const invalid = validateSocialImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      const signed = await createSocialImageUpload({ type: file.type, size: file.size });
      if (!signed.upload) throw new Error(signed.error ?? "Couldn't start the upload.");
      const { error: uploadError } = await createClient()
        .storage.from(SOCIAL_IMAGE_BUCKET)
        .uploadToSignedUrl(signed.upload.path, signed.upload.token, file, {
          contentType: file.type,
          cacheControl: "31536000",
        });
      if (uploadError) throw new Error(uploadError.message);
      onUploaded(signed.upload.publicUrl);
      onChange(signed.upload.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !busy && !disabled) void upload(file);
  }

  const dragProps = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (!busy && !disabled) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop,
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {value ? (
        <div
          {...dragProps}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-2 transition-colors",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={value} alt="Post photo" fill unoptimized sizes="112px" className="object-cover" />
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin" aria-label="Uploading" />
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={disabled || busy}
              onClick={() => onChange("")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          {...dragProps}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40",
            (disabled || busy) && "pointer-events-none opacity-70",
          )}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm font-medium">{busy ? "Uploading…" : "Drop a photo here, or choose one"}</span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG or GIF • up to {MAX_MB} MB • 1080 × 1080 or 1200 × 630 look best
          </span>
        </label>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
