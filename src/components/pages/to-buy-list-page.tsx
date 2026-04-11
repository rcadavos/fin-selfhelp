"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getToBuyItems,
  saveToBuyItems,
  clearToBuyLocalStorage,
  getToDoItems,
  saveToDoItems,
  clearToDoLocalStorage,
  generateToBuyItemId,
  getCategoryLabel,
  TO_BUY_CATEGORIES,
  type ToBuyItem,
  type ToBuyCategory,
} from "@/lib/to-buy-storage";
import { loadMyToBuyFromServer, replaceMyToBuyOnServer } from "@/actions/to-buy-db";
import { loadMyToDoFromServer, replaceMyToDoOnServer } from "@/actions/to-do-db";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Check,
  X,
  ShoppingCart,
  ClipboardList,
  ListChecks,
  Package,
  ChevronDown,
} from "lucide-react";

export type ToBuyListMode = "buy" | "do";

type FilterMode = "all" | "unchecked" | "checked";

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
        "h-8 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none",
        "focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm",
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

  const cfg = useMemo(() => {
    if (mode === "buy") {
      return {
        load: loadMyToBuyFromServer,
        replace: replaceMyToBuyOnServer,
        getLocal: getToBuyItems,
        saveLocal: saveToBuyItems,
        clearLocal: clearToBuyLocalStorage,
        title: "To-Buy List",
        subtitle: "Track what you need to buy. Prices are estimates to help you budget.",
        emptyMessage: "Your to-buy list is empty. Add your first item!",
        placeholder: "e.g. Rice, Shampoo, USB cable",
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
      subtitle: "Track what you need to do. Prices are estimates to help you budget.",
      emptyMessage: "Your to-do list is empty. Add your first item!",
      placeholder: "e.g. Call plumber, Pay bill, Book checkup",
      ListIcon: ClipboardList,
    } as const;
  }, [mode]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState<ToBuyCategory>("grocery");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState<ToBuyCategory>("grocery");

  const [filter, setFilter] = useState<FilterMode>("all");

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

  const openExpand = (item: ToBuyItem) => {
    setExpandedId(item.id);
    setEditQuantity(String(item.quantity));
    setEditPrice(item.estimatedPrice);
    setEditCategory(item.category);
  };

  const closeExpand = () => {
    setExpandedId(null);
  };

  const saveExpandedDetails = () => {
    if (!expandedId) return;
    const qty = Math.max(1, parseInt(editQuantity, 10) || 1);
    persist(
      items.map((it) =>
        it.id === expandedId
          ? {
              ...it,
              quantity: qty,
              estimatedPrice: editPrice,
              category: editCategory,
            }
          : it
      )
    );
    closeExpand();
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === "unchecked") return !it.checked;
      if (filter === "checked") return it.checked;
      return true;
    });
  }, [items, filter]);

  const totalEstimated = useMemo(
    () =>
      items.reduce((sum, it) => {
        const price = parseInt(it.estimatedPrice.replace(/\D/g, ""), 10) || 0;
        return sum + price * it.quantity;
      }, 0),
    [items]
  );

  const checkedCount = useMemo(() => items.filter((it) => it.checked).length, [items]);
  const uncheckedCount = items.length - checkedCount;

  if (loading || !loaded) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const idSuffix = mode === "buy" ? "buy" : "do";
  const ListIcon = cfg.ListIcon;

  function handleAdd() {
    const name = formName.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(formQuantity, 10) || 1);
    const newItem: ToBuyItem = {
      id: generateToBuyItemId(),
      name,
      quantity: qty,
      estimatedPrice: formPrice,
      category: formCategory,
      checked: false,
      createdAt: new Date().toISOString(),
    };
    persist([newItem, ...items]);
    setFormName("");
    setFormQuantity("1");
    setFormPrice("");
    setFormCategory("grocery");
    setShowAddForm(false);
  }

  function handleToggle(id: string) {
    persist(
      items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
    setExpandedId((cur) => (cur === id ? null : cur));
  }

  function handleDelete(id: string) {
    persist(items.filter((it) => it.id !== id));
    if (expandedId === id) closeExpand();
  }

  function handleClearChecked() {
    persist(items.filter((it) => !it.checked));
    closeExpand();
  }

  function commitName(id: string, name: string) {
    persist(items.map((it) => (it.id === id ? { ...it, name } : it)));
  }

  return (
    <div className="container mx-auto max-w-2xl py-4 px-4">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ListIcon className="h-6 w-6 text-primary" />
          {cfg.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{cfg.subtitle}</p>
      </div>

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {items.length} item{items.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <ListChecks className="h-3 w-3" />
            {uncheckedCount} remaining
          </Badge>
          {totalEstimated > 0 && (
            <span className="text-muted-foreground">
              Est. total:{" "}
              <span className="font-medium text-foreground">{formatCurrency(totalEstimated)}</span>
            </span>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["all", "unchecked", "checked"] as FilterMode[]).map((m) => (
            <Button
              key={m}
              variant={filter === m ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(m)}
              className="capitalize"
            >
              {m}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {checkedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChecked}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear checked
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? (
              <>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add item
              </>
            )}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-4 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`item-name-${idSuffix}`}>Item name</Label>
              <Input
                id={`item-name-${idSuffix}`}
                placeholder={cfg.placeholder}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`item-qty-${idSuffix}`}>Quantity</Label>
                <Input
                  id={`item-qty-${idSuffix}`}
                  type="number"
                  min={1}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`item-price-${idSuffix}`}>Est. price</Label>
                <AmountInput
                  id={`item-price-${idSuffix}`}
                  placeholder="0"
                  value={formPrice}
                  onChange={setFormPrice}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ToBuyCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TO_BUY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!formName.trim()} className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              Add to list
            </Button>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListIcon className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              {items.length === 0 ? cfg.emptyMessage : "No items match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {filtered.map((item) => {
              const price = parseInt(item.estimatedPrice.replace(/\D/g, ""), 10) || 0;
              const lineTotal = price * item.quantity;
              const isExpanded = expandedId === item.id;

              return (
                <li key={item.id} className={cn("bg-card", item.checked && "bg-muted/20")}>
                  <div className="flex items-start gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.checked}
                      onClick={() => handleToggle(item.id)}
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        item.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 hover:border-primary"
                      )}
                    >
                      {item.checked && <Check className="h-3 w-3" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <InlineItemName item={item} onCommit={commitName} />
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                          {getCategoryLabel(item.category)}
                        </Badge>
                        {item.quantity > 1 && <span>Qty {item.quantity}</span>}
                        {price > 0 && (
                          <span>
                            {formatCurrency(price)}
                            {item.quantity > 1 && (
                              <>
                                {" "}
                                each · {formatCurrency(lineTotal)} total
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Hide details" : "Edit quantity, price, category"}
                        onClick={() => (isExpanded ? closeExpand() : openExpand(item))}
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-3 py-3 sm:px-4">
                      <div className="mx-auto max-w-md space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min={1}
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Est. price</Label>
                            <AmountInput placeholder="0" value={editPrice} onChange={setEditPrice} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Select
                            value={editCategory}
                            onValueChange={(v) => setEditCategory(v as ToBuyCategory)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TO_BUY_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveExpandedDetails} className="flex-1">
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Save details
                          </Button>
                          <Button size="sm" variant="outline" onClick={closeExpand} className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
