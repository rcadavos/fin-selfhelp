"use client";

import { useRef, useState, useCallback } from "react";
import { Bold, Italic, Link2, List, ListOrdered, Heading2, Eye, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "write" | "preview";

type HtmlEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
};

export function HtmlEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  minRows = 8,
  className,
}: HtmlEditorProps) {
  const [mode, setMode] = useState<Mode>("write");
  const [showSource, setShowSource] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback(
    (before: string, after: string = before) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.slice(start, end);
      const next = el.value.slice(0, start) + before + selected + after + el.value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = start + before.length;
        el.selectionEnd = end + before.length;
      });
    },
    [onChange]
  );

  const insertBlock = useCallback(
    (template: (selection: string) => string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = el.value.slice(start, end) || "Item";
      const inserted = template(selected);
      const next = el.value.slice(0, start) + inserted + el.value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + inserted.length;
        el.selectionStart = el.selectionEnd = pos;
      });
    },
    [onChange]
  );

  const insertLink = useCallback(() => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    wrapSelection(`<a href="${url}" style="color:#16A34A;text-decoration:underline;">`, "</a>");
  }, [wrapSelection]);

  const tools = [
    { label: "Bold", icon: Bold, onClick: () => wrapSelection("<strong>", "</strong>") },
    { label: "Italic", icon: Italic, onClick: () => wrapSelection("<em>", "</em>") },
    { label: "Heading", icon: Heading2, onClick: () => insertBlock((s) => `\n<h2 style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#0f172a;">${s}</h2>\n`) },
    { label: "Bulleted list", icon: List, onClick: () => insertBlock((s) => `\n<ul style="margin:8px 0;padding-left:20px;">\n  <li>${s}</li>\n</ul>\n`) },
    { label: "Numbered list", icon: ListOrdered, onClick: () => insertBlock((s) => `\n<ol style="margin:8px 0;padding-left:20px;">\n  <li>${s}</li>\n</ol>\n`) },
    { label: "Link", icon: Link2, onClick: insertLink },
  ] as const;

  return (
    <div className={cn("rounded-md border border-input bg-transparent", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {tools.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={mode === "preview"}
            aria-label={label}
            title={label}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          disabled={mode === "preview"}
          aria-label="Toggle source"
          title={showSource ? "Hide HTML source" : "Show HTML source"}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
            showSource ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Code2 className="h-3.5 w-3.5" />
        </button>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              mode === "write" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
              mode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>
      {mode === "write" ? (
        showSource ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={minRows}
            className="w-full resize-y rounded-b-md bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <div
            className="prose prose-sm max-w-none px-3 py-3 text-sm dark:prose-invert"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-muted-foreground">${placeholder}</p>` }}
            style={{ minHeight: `${minRows * 1.5}rem` }}
          />
        )
      ) : (
        <div className="rounded-b-md bg-muted/30 px-3 py-3">
          {value.trim() ? (
            <div
              className="prose prose-sm max-w-none text-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
