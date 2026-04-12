"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { loadMyToBuyFromServer, replaceMyToBuyOnServer } from "@/actions/to-buy-db";
import { loadMyToDoFromServer, replaceMyToDoOnServer } from "@/actions/to-do-db";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Trash2, Check, ShoppingCart, ClipboardList } from "lucide-react";

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
  onCommit: (id: string, name: string) => void;
}) {
  const [val, setVal] = useState(item.name);
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
          setVal(item.name);
          return;
        }
        if (t !== item.name) onCommit(item.id, t);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-8 min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 py-0 text-base shadow-none transition-colors",
        "focus-visible:ring-0 focus-visible:border-primary/60 focus-visible:ring-offset-0 md:text-sm",
        item.checked && "text-muted-foreground line-through decoration-muted-foreground/80"
      )}
      aria-label="Item name"
    />
  );
}

export function ToBuyListPage({ mode }: { mode: ToBuyListMode }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [items, setItems] = useState<ToBuyItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composer, setComposer] = useState("");
  const skipComposerBlur = useRef(false);

  const cfg = useMemo(() => {
    if (mode === "buy") {
      return {
        load: loadMyToBuyFromServer,
        replace: replaceMyToBuyOnServer,
        getLocal: getToBuyItems,
        saveLocal: saveToBuyItems,
        clearLocal: clearToBuyLocalStorage,
        title: "To-Buy List",
        subtitle: "Check items off when you have them, then delete to clear the line.",
        ListIcon: ShoppingCart,
      } as const;
    }
    return {
      load: loadMyToDoFromServer,
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
      setItems(ordered);
      if (user) {
        void cfg.replace(ordered).then(({ error }) => {
          if (error) cfg.saveLocal(ordered);
          else cfg.clearLocal();
        });
      } else {
        cfg.saveLocal(ordered);
      }
    },
    [user, cfg]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const { items: remote, error } = await cfg.load();
      if (cancelled) return;
      if (error) {
        setItems(orderItemsLikeNotes(cfg.getLocal()));
        setLoaded(true);
        return;
      }
      let list = remote ?? [];
      if (list.length === 0) {
        const local = cfg.getLocal();
        if (local.length > 0) {
          const ordered = orderItemsLikeNotes(local);
          const { error: syncErr } = await cfg.replace(ordered);
          if (!syncErr) {
            cfg.clearLocal();
            const again = await cfg.load();
            list = again.items ?? [];
          }
        }
      }
      setItems(orderItemsLikeNotes(list));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, router, cfg]);

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
    persist(items.map((it) => (it.id === id ? { ...it, name } : it)));
  }

  if (loading || !loaded) {
    return <DashboardSkeleton variant="to-buy-list" />;
  }

  const ListIcon = cfg.ListIcon;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ListIcon className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          {cfg.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cfg.subtitle}</p>
      </header>

      <ul className="divide-y divide-border/70">
        {items.map((item) => (
          <li key={item.id} className="py-3">
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
                <InlineItemName item={item} onCommit={commitName} />
                {item.checked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete item"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
