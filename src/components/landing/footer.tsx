import { cn } from "@/lib/utils";
import { FooterFeedback } from "./footer-feedback";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t px-4 py-8 sm:px-6 lg:px-8",
        className
      )}
    >
      <FooterFeedback />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row pt-8">
        <p className="text-sm text-muted-foreground">
          Financial Tracker — simple cashflow tracking for everyone.
          {SUPPORT_EMAIL && (
            <> Contact:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">
                {SUPPORT_EMAIL}
              </a>
            </>
          )}
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#reviews" className="hover:text-foreground">
            Reviews
          </a>
        </div>
      </div>
    </footer>
  );
}
