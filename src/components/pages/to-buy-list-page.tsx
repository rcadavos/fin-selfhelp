"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getToBuyItems,
  saveToBuyItems,
  clearToBuyLocalStorage,
  getToDoItems,
  saveToDoItems,
  clearToDoLocalStorage,
  generateToBuyItemId,
  REMINDER_CATEGORIES,
  type ToBuyItem,
  type ToBuyCategory,
} from "@/lib/to-buy-storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { replaceMyToBuyOnServer } from "@/actions/to-buy-db";
import { replaceMyToDoOnServer } from "@/actions/to-do-db";
import { queryKeys } from "@/lib/query/keys";
import { toBuyItemsQueryOptions, toDoItemsQueryOptions } from "@/lib/query/to-buy-to-do-lists";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES, formatDateWithPreferences } from "@/lib/user-preferences";
import { Calendar } from "@/components/ui/calendar";
import { HoverPopover } from "@/components/ui/hover-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseYmdToLocalDate } from "@/components/ui/date-picker";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { Trash2, Check, ShoppingCart, Bell, CalendarDays, Lock } from "lucide-react";
import { FREE_TIER_MAX_LIST_ITEMS } from "@/lib/subscription-tier";

export type ToBuyListMode = "buy" | "do";

function CategorySelect({
  value,
  onChange,
}: {
  value: ToBuyCategory;
  onChange: (cat: ToBuyCategory) => void;
}) {
  const known = REMINDER_CATEGORIES.find((c) => c.value === value);
  const label = known?.label ?? "Other";
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ToBuyCategory)}>
      <SelectTrigger className="h-6 w-auto min-w-[4rem] max-w-[8rem] rounded-full border border-border/60 bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REMINDER_CATEGORIES.map((cat) => (
          <SelectItem key={cat.value} value={cat.value} className="text-xs">
            {cat.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function orderItemsLikeNotes(list: ToBuyItem[]): ToBuyItem[] {
  const open = list.filter((i) => !i.checked);
  const done = list.filter((i) => i.checked);
  return [...open, ...done];
}

function InlineItemName({
  item,
  onCommit,
}: {
  item: ToBuyItem;
  /** Pass `""` after clearing the field and pressing Enter to remove the row. */
  onCommit: (id: string, name: string) => void;
}) {
  const [val, setVal] = useState(item.name);
  const commitEmptyOnBlurRef = useRef(false);
  useEffect(() => {
    setVal(item.name);
  }, [item.id, item.name]);

  return (
    <Input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const t = val.trim();
        if (!t) {
          if (commitEmptyOnBlurRef.current) {
            commitEmptyOnBlurRef.current = false;
            onCommit(item.id, "");
          } else {
            setVal(item.name);
          }
          return;
        }
        commitEmptyOnBlurRef.current = false;
        if (t !== item.name) onCommit(item.id, t);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!val.trim()) {
            commitEmptyOnBlurRef.current = true;
          }
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-8 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none md:text-sm",
        "outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        item.checked && "text-muted-foreground line-through decoration-muted-foreground/80"
      )}
      aria-label="Item name"
    />
  );
}

function TargetDatePickerIcon({
  value,
  onChange,
  formattedValue,
  canEdit,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  formattedValue: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ymd = value?.trim() ?? "";
  const selected = ymd ? parseYmdToLocalDate(ymd) : undefined;

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={!canEdit}
      aria-label={
        canEdit
          ? value
            ? "Change target date"
            : "Set target date"
          : "Target date is available for Pro and Premium only"
      }
    >
      <CalendarDays
        className={cn(
          "h-4 w-4",
          value
            ? "text-emerald-600 dark:text-emerald-400"
            : canEdit
              ? "text-muted-foreground"
              : "text-muted-foreground/60"
        )}
        aria-hidden
      />
    </Button>
  );

  return (
    <div className="relative flex h-8 shrink-0 items-center gap-1.5">
      {value ? <span className="text-xs tabular-nums text-muted-foreground">{formattedValue}</span> : null}
      {canEdit ? (
        <Popover modal={false} open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="z-[100] w-auto border-0 bg-transparent p-0 shadow-none" align="end">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? new Date()}
              onSelect={(d) => {
                if (!d) return;
                onChange(formatYmdLocal(d));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <HoverPopover
          align="end"
          trigger={trigger}
          content={<span className="text-xs">Target date is for Pro and Premium only.</span>}
        />
      )}
    </div>
  );
}

export function ToBuyListPage({ mode }: { mode: ToBuyListMode }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const prefsOptional = useUserPreferencesOptional();
  const queryClient = useQueryClient();
  const listQueryKey = useMemo(
    () => (mode === "buy" ? queryKeys.toBuyItems() : queryKeys.toDoItems()),
    [mode]
  );
  const toBuyQuery = useQuery({
    ...toBuyItemsQueryOptions(),
    enabled: !!user && !loading && mode === "buy",
  });
  const toDoQuery = useQuery({
    ...toDoItemsQueryOptions(),
    enabled: !!user && !loading && mode === "do",
  });
  const listQuery = mode === "buy" ? toBuyQuery : toDoQuery;
  const capabilitiesQuery = useQuery({
    ...subscriptionCapabilitiesQueryOptions(),
    enabled: !!user && !loading,
  });
  const items = listQuery.data ?? [];
  const hasProAccess = Boolean(capabilitiesQuery.data?.hasProLevelAccess);
  const canEditTargetDate = hasProAccess;
  const [composer, setComposer] = useState("");
  const skipComposerBlur = useRef(false);

  const cfg = useMemo(() => {
    if (mode === "buy") {
      return {
        replace: replaceMyToBuyOnServer,
        getLocal: getToBuyItems,
        saveLocal: saveToBuyItems,
        clearLocal: clearToBuyLocalStorage,
        title: "To-Buy List",
        subtitle: "This can be shared with your partner to track items they need to buy. Just go to Shared with me and give them access.",
        ListIcon: ShoppingCart,
      } as const;
    }
    return {
      replace: replaceMyToDoOnServer,
      getLocal: getToDoItems,
      saveLocal: saveToDoItems,
      clearLocal: clearToDoLocalStorage,
      title: "Reminders",
      subtitle: "Add your reminders and tasks. Check them off when done, assign a category to stay organized, and set a target date to track when things need to happen.",
      ListIcon: Bell,
    } as const;
  }, [mode]);

  const planNote = hasProAccess
    ? "Unlimited items with Pro or Premium."
    : `Free plan: ${FREE_TIER_MAX_LIST_ITEMS} items max. Upgrade to Pro for unlimited.`;

  const persist = useCallback(
    async (next: ToBuyItem[]) => {
      const ordered = orderItemsLikeNotes(next);

      // Optimistic update
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      const previousItems = queryClient.getQueryData(listQueryKey);
      queryClient.setQueryData(listQueryKey, ordered);

      if (user) {
        try {
          const { error } = await cfg.replace(ordered);
          if (error) {
            // Rollback on error if needed, but here we just try to save local fallback
            cfg.saveLocal(ordered);
            // Optionally: queryClient.setQueryData(listQueryKey, previousItems);
          } else {
            cfg.clearLocal();
            // Don't invalidate immediately to avoid jitter; let the optimistic state live
            // void queryClient.invalidateQueries({ queryKey: listQueryKey });
          }
        } catch (err) {
          cfg.saveLocal(ordered);
        }
      } else {
        cfg.saveLocal(ordered);
      }
    },
    [user, cfg, queryClient, listQueryKey]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [loading, user, router]);

  function commitComposer() {
    const name = composer.trim();
    if (!name) return;
    const newItem: ToBuyItem = {
      id: generateToBuyItemId(),
      name,
      quantity: 1,
      estimatedPrice: "",
      category: mode === "do" ? "personal" : "grocery",
      checked: false,
      createdAt: new Date().toISOString(),
    };
    persist([...items, newItem]);
    setComposer("");
  }

  function handleToggle(id: string) {
    persist(items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  }

  function handleDelete(id: string) {
    persist(items.filter((it) => it.id !== id));
  }

  function commitName(id: string, name: string) {
    const t = name.trim();
    if (!t) {
      handleDelete(id);
      return;
    }
    persist(items.map((it) => (it.id === id ? { ...it, name: t } : it)));
  }

  function commitTargetDate(id: string, targetDate: string) {
    const normalized = targetDate.trim() ? targetDate.trim() : null;
    persist(items.map((it) => (it.id === id ? { ...it, targetDate: normalized } : it)));
  }

  function commitCategory(id: string, category: ToBuyCategory) {
    persist(items.map((it) => (it.id === id ? { ...it, category } : it)));
  }

  if (loading || !user || listQuery.isPending) {
    return <DashboardSkeleton variant="page" />;
  }

  const ListIcon = cfg.ListIcon;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6">
      <ContentHeader title={cfg.title} subtitle={cfg.subtitle} icon={ListIcon} />
      <p className={cn(
        "mb-4 -mt-2 text-[11px] font-medium",
        hasProAccess ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
      )}>
        {planNote}
      </p>

      <ul>
        {items.map((item, index) => {
          const isLocked = !hasProAccess && index >= FREE_TIER_MAX_LIST_ITEMS;
          return (
            <li
              key={item.id}
              className={cn(
                "relative border-b border-border/70 py-3 transition-colors last:border-b-0",
                isLocked ? "overflow-hidden" : "focus-within:border-emerald-300",
              )}
            >
              <div className={cn(
                "flex items-center gap-3",
                isLocked && "pointer-events-none select-none blur-sm opacity-60",
              )}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.checked}
                  aria-label={item.checked ? "Mark as not done" : "Mark as done"}
                  onClick={() => handleToggle(item.id)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    item.checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/45 hover:border-primary"
                  )}
                >
                  {item.checked ? <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> : null}
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                  <InlineItemName
                    item={item}
                    onCommit={commitName}
                  />
                  {mode === "do" && !item.checked ? (
                    <CategorySelect
                      value={item.category}
                      onChange={(cat) => commitCategory(item.id, cat)}
                    />
                  ) : null}
                  {mode === "do" && (!item.checked || item.targetDate) ? (
                    <TargetDatePickerIcon
                      value={item.targetDate}
                      onChange={(next) => commitTargetDate(item.id, next)}
                      formattedValue={
                        item.targetDate
                          ? formatDateWithPreferences(
                              item.targetDate,
                              prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
                            )
                          : ""
                      }
                      canEdit={canEditTargetDate}
                    />
                  ) : null}
                  {item.checked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete item"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-sm">
                    <Lock className="h-2.5 w-2.5" />
                    Pro
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-1 flex items-center gap-3 border-t border-border/70 pt-4">
        <div
          className="h-5 w-5 shrink-0 rounded-full border border-dashed border-muted-foreground/30"
          aria-hidden
        />
        <Input
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              skipComposerBlur.current = true;
              commitComposer();
              queueMicrotask(() => {
                skipComposerBlur.current = false;
              });
            }
          }}
          onBlur={() => {
            if (skipComposerBlur.current) return;
            commitComposer();
          }}
          placeholder=""
          aria-label="Add new item"
          className="h-9 flex-1 rounded-none border-0 border-b-2 border-muted-foreground/35 bg-transparent px-0 text-base shadow-none placeholder:text-transparent focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
        />
      </div>
    </div>
  );
}
