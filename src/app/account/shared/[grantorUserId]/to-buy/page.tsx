"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { granteeSharedSetToBuyChecked, loadSharedToBuyForGrantor } from "@/actions/to-buy-db";
import { ContentHeader } from "@/components/app/content-header";
import { getCategoryLabel, type ToBuyItem } from "@/lib/to-buy-storage";
import { formatCurrency, cn } from "@/lib/utils";
import { ShoppingCart, Check, Loader2, Package } from "lucide-react";

export default function SharedToBuyPage({ params }: { params: Promise<{ grantorUserId: string }> }) {
  const { grantorUserId } = use(params);
  const [items, setItems] = useState<ToBuyItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void loadSharedToBuyForGrantor(grantorUserId).then((res) => {
      if (res.error) setErr(res.error);
      else {
        setErr(null);
        setItems(res.items ?? []);
      }
    });
  }, [grantorUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onToggleChecked(item: ToBuyItem) {
    const next = !item.checked;
    setActionError(null);
    setSavingId(item.id);
    const res = await granteeSharedSetToBuyChecked(item.id, next);
    setSavingId(null);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, checked: next } : it)));
  }

  if (err) {
    return (
      <div className="w-full py-2">
        <p className="text-destructive">{err}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/account/shared">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full py-2">
      <ContentHeader
        title="Partner To-Buy"
        subtitle="You can check items off in your partner's list."
        icon={ShoppingCart}
        className="mb-4"
        actions={
          <div className="flex gap-2">
            <Badge variant="secondary">You can check items off</Badge>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/account/shared/${grantorUserId}`}>Hub</Link>
            </Button>
          </div>
        }
      />

      {actionError ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No items in this list.</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden surface border bg-card">
          <ul className="divide-y">
            {items.map((item) => {
              const price = parseInt(item.estimatedPrice.replace(/\D/g, ""), 10) || 0;
              const line = price * item.quantity;
              return (
                <li key={item.id} className={cn("flex items-start gap-3 px-4 py-3", item.checked && "bg-muted/20")}>
                  <button
                    type="button"
                    onClick={() => void onToggleChecked(item)}
                    disabled={savingId === item.id}
                    aria-pressed={item.checked}
                    aria-label={item.checked ? `Mark ${item.name} as not done` : `Mark ${item.name} as done`}
                    className={cn(
                      "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-opacity",
                      item.checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                      savingId === item.id && "opacity-60"
                    )}
                  >
                    {savingId === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : item.checked ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", item.checked && "text-muted-foreground line-through")}>{item.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryLabel(item.category)}
                      </Badge>
                      {item.quantity > 1 && <span>Qty {item.quantity}</span>}
                      {price > 0 && <span>{formatCurrency(price)}</span>}
                      {price > 0 && item.quantity > 1 && <span>• {formatCurrency(line)} total</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        <Package className="mr-1 inline h-3 w-3" />
        You can check items off when you buy or handle them; your partner sees the same. Adding or removing items is
        still only from their account.
      </p>
    </div>
  );
}
