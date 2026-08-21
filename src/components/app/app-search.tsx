"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchItems, type SearchItem } from "@/lib/search-index";
import { useAppMode } from "@/hooks/use-app-mode";

// ── Shared results list ───────────────────────────────────────────────────

function SearchResults({
  results,
  activeIndex,
  onSelect,
  className,
}: {
  results: SearchItem[];
  activeIndex: number;
  onSelect: () => void;
  className?: string;
}) {
  if (results.length === 0) return null;

  // Group results by category
  const grouped = results.reduce<Record<string, SearchItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <ul className={cn("py-1", className)}>
      {Object.entries(grouped).map(([group, items]) => (
        <li key={group}>
          <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {group}
          </p>
          {items.map((item) => {
            const globalIdx = results.indexOf(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onSelect}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-sm transition-colors",
                  globalIdx === activeIndex
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span className="font-medium">{item.title}</span>
                <ArrowUpRight className="ml-3 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

// ── Mobile inline search (replaces header content while open) ────────────

export function MobileSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mode } = useAppMode();

  const results = searchItems(query, undefined, mode);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && results.length > 0) {
      router.push(results[activeIndex].href);
      onClose();
    }
  }

  return (
    <div ref={containerRef}>
      {/* Search row */}
      <div className="flex h-14 w-full items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search anything…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          style={{ fontSize: "16px" }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results panel — absolutely positioned below the header */}
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-[60vh] overflow-y-auto border-b bg-background shadow-xl">
          <SearchResults results={results} activeIndex={activeIndex} onSelect={onClose} />
        </div>
      )}

      {/* Empty state */}
      {query.trim().length > 0 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-background px-4 py-6 text-center shadow-xl">
          <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

// ── Desktop search bar (used inside app-shell toolbar) ───────────────────

export function DesktopSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mode } = useAppMode();

  const results = searchItems(query, undefined, mode);
  const showResults = isFocused && (results.length > 0 || query.trim().length > 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setIsFocused(false); inputRef.current?.blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && results.length > 0) {
      router.push(results[activeIndex].href);
      setQuery("");
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }

  function handleSelect() {
    setQuery("");
    setIsFocused(false);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <label htmlFor="desktop-search" className="sr-only">Search</label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="desktop-search"
          type="search"
          placeholder="Search…"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border bg-background shadow-xl">
          {results.length > 0 ? (
            <SearchResults results={results} activeIndex={activeIndex} onSelect={handleSelect} />
          ) : (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
