"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getStoredCookieConsent,
  setStoredCookieConsent,
  type CookieConsentChoice,
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

  function choose(choice: CookieConsentChoice) {
    setStoredCookieConsent(choice);
    setOpen(false);
  }

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        placement="bottom"
        showClose={false}
        className="max-w-md sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby="cookie-consent-desc"
      >
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription id="cookie-consent-desc" className="text-left leading-relaxed">
            We use cookies and similar storage for essential features (such as signing you in and
            remembering your theme). With your permission we can also use optional cookies to
            improve the product over time. Read more in our{" "}
            <Link
              href={LEGAL_ROUTES.cookies}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              cookie notice
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-1/2"
            onClick={() => choose("essential")}
          >
            Essential
          </Button>
          <Button type="button" className="w-1/2" onClick={() => choose("all")}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
