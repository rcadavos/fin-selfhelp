"use client";

import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AI_CHAT_MODELS } from "@/lib/constants/ai";

export function ProviderSwitcher({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-auto min-h-[2.75rem] justify-start gap-2 py-1.5 text-left text-xs [&>span]:flex [&>span]:min-w-0 [&>span]:flex-1 [&>span]:flex-col [&>span]:items-start",
          compact ? "w-full" : "w-[240px]",
        )}
        aria-label="Choose AI model"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AI_CHAT_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id} className="text-xs">
            <span className="flex flex-col items-start text-left">
              <span className="font-medium">{model.label}</span>
              <span className="text-[10px] text-muted-foreground">{model.hint}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
