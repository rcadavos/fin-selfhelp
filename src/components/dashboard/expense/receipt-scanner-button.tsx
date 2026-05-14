"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProFeatureDialog } from "@/components/app/pro-feature-dialog";
import { subscriptionStatusQueryOptions } from "@/lib/query/subscription-user";
import { parseReceipt, type ParsedReceipt } from "@/lib/utils/parse-receipt";
import {
  OCR_ALLOWED_ACCEPT_ATTR,
  OCR_ALLOWED_MIME_TYPES,
  OCR_LANGUAGE,
  OCR_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/ocr";

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning"; progress: number }
  | { kind: "result"; parsed: ParsedReceipt }
  | { kind: "error"; message: string };

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ReceiptScannerButton({
  onExtract,
}: {
  onExtract: (parsed: ParsedReceipt) => void;
}) {
  const { data: subscriptionStatus } = useQuery(subscriptionStatusQueryOptions());
  const isPro = !!(subscriptionStatus?.hasProAccess || subscriptionStatus?.hasPremiumAccess);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });
  const [modalOpen, setModalOpen] = useState(false);

  function handleClick() {
    if (!isPro) {
      setUpsellOpen(true);
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!OCR_ALLOWED_MIME_TYPES.includes(file.type as (typeof OCR_ALLOWED_MIME_TYPES)[number])) {
      setScanState({ kind: "error", message: "Please pick a JPEG, PNG, or WebP image." });
      setModalOpen(true);
      return;
    }
    if (file.size > OCR_MAX_FILE_SIZE_BYTES) {
      setScanState({ kind: "error", message: "Image is too large. Max 5MB." });
      setModalOpen(true);
      return;
    }

    setScanState({ kind: "scanning", progress: 0 });
    setModalOpen(true);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(OCR_LANGUAGE, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setScanState({ kind: "scanning", progress: m.progress });
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseReceipt(data.text ?? "");
      if (!parsed.amount && !parsed.date && !parsed.merchant) {
        setScanState({
          kind: "error",
          message: "Couldn't read the receipt. Please enter the details manually.",
        });
        return;
      }
      setScanState({ kind: "result", parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan receipt.";
      setScanState({ kind: "error", message });
    }
  }

  function handleApply() {
    if (scanState.kind === "result") {
      onExtract(scanState.parsed);
    }
    closeModal();
  }

  function closeModal() {
    setModalOpen(false);
    setScanState({ kind: "idle" });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="w-full justify-center gap-2"
      >
        <ScanLine className="h-4 w-4" />
        <span>Scan Receipt</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Pro
        </span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept={OCR_ALLOWED_ACCEPT_ATTR}
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      <ProFeatureDialog
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        feature="Scan Receipt"
        description="Upload or snap a photo of a receipt and we'll fill in the amount, date, and merchant automatically. Available on Pro."
      />

      <Dialog open={modalOpen} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Receipt</DialogTitle>
            <DialogDescription>
              We'll try to read the amount, date, and merchant from your photo.
            </DialogDescription>
          </DialogHeader>

          {scanState.kind === "scanning" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Reading receipt… {Math.round(scanState.progress * 100)}%
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(5, scanState.progress * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                First scan downloads the OCR engine • subsequent scans are faster
              </p>
            </div>
          )}

          {scanState.kind === "error" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-foreground">{scanState.message}</p>
            </div>
          )}

          {scanState.kind === "result" && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Review the detected values, then apply them to the form.
              </p>
              <dl className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd className="text-right font-medium">
                    {scanState.parsed.merchant ?? <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="text-right font-medium">
                    {scanState.parsed.amount !== undefined
                      ? `₱${scanState.parsed.amount.toFixed(2)}`
                      : <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right font-medium">
                    {scanState.parsed.date
                      ? formatDisplayDate(scanState.parsed.date)
                      : <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <DialogFooter className="gap-2">
            {scanState.kind === "result" ? (
              <>
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={handleApply}>Apply to form</Button>
              </>
            ) : (
              <Button
                variant={scanState.kind === "error" ? "default" : "outline"}
                onClick={closeModal}
                disabled={scanState.kind === "scanning"}
              >
                {scanState.kind === "error" ? "Close" : "Cancel"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
