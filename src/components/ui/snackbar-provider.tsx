"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SnackbarVariant = "error" | "success" | "info";

type SnackbarMessage = {
  id: number;
  message: string;
  variant: SnackbarVariant;
};

type SnackbarContextValue = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

let nextId = 0;
const AUTO_DISMISS_MS = 5000;

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const add = useCallback((message: string, variant: SnackbarVariant) => {
    const id = ++nextId;
    setMessages((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const remove = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const showError = useCallback((message: string) => add(message, "error"), [add]);
  const showSuccess = useCallback((message: string) => add(message, "success"), [add]);
  const showInfo = useCallback((message: string) => add(message, "info"), [add]);

  return (
    <SnackbarContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col gap-2 p-4 pointer-events-none sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
        aria-live="polite"
      >
        {messages.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg",
              item.variant === "error" &&
                "border-destructive/50 bg-destructive/10 text-destructive",
              item.variant === "success" &&
                "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              item.variant === "info" &&
                "border-primary/50 bg-primary/10 text-primary"
            )}
          >
            <p className="text-sm font-medium flex-1">{item.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
              onClick={() => remove(item.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}
