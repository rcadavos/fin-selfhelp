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
  type ToBuyItem,
} from "@/lib/to-buy-storage";
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
import { Trash2, Check, ShoppingCart, ClipboardList, CalendarDays } from "lucide-react";

export type ToBuyListMode = "buy" | "do";

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
  const canEditTargetDate = Boolean(capabilitiesQuery.data?.hasProLevelAccess);
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
      title: "To-Do List",
      subtitle: "Check tasks off when they are done, then delete to remove them.",
      ListIcon: ClipboardList,
    } as const;
  }, [mode]);

  const persist = useCallback(
    (next: ToBuyItem[]) => {
      const ordered = orderItemsLikeNotes(next);
      queryClient.setQueryData(listQueryKey, ordered);
      if (user) {
        void cfg.replace(ordered).then(({ error }) => {
          if (error) cfg.saveLocal(ordered);
          else {
            cfg.clearLocal();
            void queryClient.invalidateQueries({ queryKey: listQueryKey });
          }
        });
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
      category: "grocery",
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

  if (loading || !user || listQuery.isPending) {
    return <DashboardSkeleton variant="to-buy-list" />;
  }

  const ListIcon = cfg.ListIcon;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6">
      <ContentHeader title={cfg.title} subtitle={cfg.subtitle} icon={ListIcon} />

      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className="border-b border-border/70 py-3 transition-colors focus-within:border-emerald-300 last:border-b-0"
          >
            <div className="flex items-center gap-3">
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
                {mode === "do" ? (
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
          </li>
        ))}
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
