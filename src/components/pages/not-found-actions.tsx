"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export function NotFoundActions() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="gap-2 border-border/80 bg-background/60 backdrop-blur-sm shadow-sm"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Go back
      </Button>
      <Button size="lg" className="gap-2 shadow-md" asChild>
        <Link href="/">
          <Home className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </Button>
    </div>
  );
}
