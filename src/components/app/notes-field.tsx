import { StickyNote } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Optional free-text notes on an expense or bill form. */
export function NotesField({
  id,
  value,
  onChange,
  placeholder = "Add a note…",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        Notes <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

/** Notes shown on a list card, clamped to two lines; renders nothing when empty. */
export function NotesPreview({ notes, className }: { notes: string | null | undefined; className?: string }) {
  const text = notes?.trim();
  if (!text) return null;
  return (
    <p className={cn("mt-1 flex items-start gap-1.5 text-[11.5px] text-muted-foreground", className)}>
      <StickyNote className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span className="line-clamp-2 min-w-0 whitespace-pre-line break-words">{text}</span>
    </p>
  );
}
