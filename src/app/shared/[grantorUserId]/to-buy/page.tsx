"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadSharedToBuyForGrantor } from "@/actions/to-buy-db";
import { getCategoryLabel, type ToBuyItem } from "@/lib/to-buy-storage";
import { formatCurrency, cn } from "@/lib/utils";
import { ShoppingCart, Check, Package } from "lucide-react";

export default function SharedToBuyPage({ params }: { params: Promise<{ grantorUserId: string }> }) {
  const { grantorUserId } = use(params);
  const [items, setItems] = useState<ToBuyItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void loadSharedToBuyForGrantor(grantorUserId).then((res) => {
      if (res.error) setErr(res.error);
      else setItems(res.items ?? []);
    });
  }, [grantorUserId]);

  if (err) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-destructive">{err}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/shared">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Partner to-buy</h1>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">View only</Badge>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/shared/${grantorUserId}`}>Hub</Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No items in this list.</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {items.map((item) => {
              const price = parseInt(item.estimatedPrice.replace(/\D/g, ""), 10) || 0;
              const line = price * item.quantity;
              return (
                <li key={item.id} className={cn("flex items-start gap-3 px-4 py-3", item.checked && "bg-muted/20")}>
                  <span
                    className={cn(
                      "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                      item.checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}
                    aria-hidden
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", item.checked && "text-muted-foreground line-through")}>{item.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryLabel(item.category)}
                      </Badge>
                      {item.quantity > 1 && <span>Qty {item.quantity}</span>}
                      {price > 0 && <span>{formatCurrency(price)}</span>}
                      {price > 0 && item.quantity > 1 && <span>· {formatCurrency(line)} total</span>}
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
        Your partner manages this list. Items sync to their account when they use To-Buy while signed in.
      </p>
    </div>
  );
}
