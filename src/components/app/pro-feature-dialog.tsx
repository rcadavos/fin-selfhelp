"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description: string;
  ctaHref?: string;
}

export function ProFeatureDialog({
  open,
  onOpenChange,
  feature,
  description,
  ctaHref = "/account/subscription",
}: ProFeatureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Pro feature</span>
          </div>
          <DialogTitle className="mt-1">{feature}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link href={ctaHref}>
              Upgrade to Pro <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
