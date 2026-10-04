"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/actions/auth";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { cn } from "@/lib/utils";
import { GOOGLE_MARK_PATHS } from "@/lib/shared/brand-marks";

type GoogleSignInButtonProps = {
  /** Post-auth path, e.g. `/dashboard` or `searchParams.get("next")`. */
  next: string;
  className?: string;
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={cn("size-5 shrink-0", className)} viewBox="0 0 24 24" aria-hidden>
      {GOOGLE_MARK_PATHS.map(({ fill, d }) => (
        <path key={fill} fill={fill} d={d} />
      ))}
    </svg>
  );
}

export function GoogleSignInButton({ next, className }: GoogleSignInButtonProps) {
  const { showError } = useSnackbar();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-11 w-full gap-2", className)}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("next", next);
          const result = await signInWithGoogle(fd);
          if (result?.error) showError(result.error);
        });
      }}
    >
      <GoogleMark />
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
