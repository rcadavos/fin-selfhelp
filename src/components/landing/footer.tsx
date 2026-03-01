import { cn } from "@/lib/utils";
import { FooterFeedback } from "./footer-feedback";

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
