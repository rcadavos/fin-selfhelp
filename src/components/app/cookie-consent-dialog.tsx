"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStoredCookieConsent,
  setStoredCookieConsent,
} from "@/lib/cookie-consent";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export function CookieConsentDialog() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getStoredCookieConsent() === null) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    setStoredCookieConsent("essential");
    setOpen(false);
  }

  if (!mounted || !open) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 surface border bg-background px-4 py-3">
      <Link
        href={LEGAL_ROUTES.cookies}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Read our cookie policy
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={dismiss}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
