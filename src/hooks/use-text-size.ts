"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_STORAGE_KEY,
  type TextSizeId,
} from "@/lib/constants/text-size";
import { applyTextSize, readStoredTextSize, storeTextSize } from "@/lib/text-size";

/**
 * One store for the whole page: the desktop toolbar and the phone header each
 * render an Aa menu, and both have to show the same choice.
 */
const listeners = new Set<() => void>();
let current: TextSizeId | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

/** Another tab changed the size (or cleared storage): follow it here too. */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== TEXT_SIZE_STORAGE_KEY) return;
  current = readStoredTextSize();
  applyTextSize(current);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): TextSizeId {
  if (current === null) current = readStoredTextSize();
  return current;
}

/** The server cannot see the saved size; the client corrects it right after hydrating. */
function getServerSnapshot(): TextSizeId {
  return DEFAULT_TEXT_SIZE;
}

function setTextSize(id: TextSizeId) {
  current = id;
  storeTextSize(id);
  applyTextSize(id);
  notify();
}

export function useTextSize(): [TextSizeId, (id: TextSizeId) => void] {
  const textSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [textSize, setTextSize];
}
