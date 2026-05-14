"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanLine } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { ocrEnabledQueryOptions } from "@/lib/query/app-settings";
import { setOcrEnabled } from "@/actions/app-settings";

function AdminOcrContent() {
  const queryClient = useQueryClient();
  const { data: enabled } = useSuspenseQuery(ocrEnabledQueryOptions());

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const result = await setOcrEnabled(next);
      if (result.error) throw new Error(result.error);
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ocrEnabledQueryOptions().queryKey });
    },
  });

  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <ContentHeader
        title="Receipt OCR"
        subtitle="Toggle the in-app receipt scanner used by the Add Expense dialog."
        icon={ScanLine}
        className="mb-0"
      />

      <Card className={!enabled ? "border-dashed opacity-90" : undefined}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Scan Receipt feature
                {!enabled && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Off
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                When enabled, Pro users see a Scan Receipt button on Add Expense.
                When disabled, the button is hidden for everyone.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="ocr-enabled" className="text-xs text-muted-foreground">
                {enabled ? "Enabled" : "Disabled"}
              </Label>
              <ToggleSwitch
                id="ocr-enabled"
                checked={enabled}
                onCheckedChange={(next) => mutation.mutate(next)}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Scanning runs entirely in the user's browser via tesseract.js. Receipt images are never uploaded or stored.
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </main>
  );
}

export default function AdminOcrPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <AdminOcrContent />
    </Suspense>
  );
}
