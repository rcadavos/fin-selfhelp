"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadExpenseTotalsForNetWorthSuggestions,
  type NetWorthItemRow,
  type NetWorthData,
} from "@/actions/net-worth";
import {
  getNetWorthItems,
  saveNetWorthItems,
  generateNetWorthItemId,
} from "@/lib/net-worth-storage";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, cn } from "@/lib/utils";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import {
  NET_WORTH_DECLARABLE_EXPENSE_CATEGORIES,
  type NetWorthCategoryKey,
  type NetWorthItemType,
  type NetWorthUseType,
} from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { Pencil, Trash2, Plus, Home, Car, Wallet, HelpCircle, ThumbsUp, Frown, Info } from "lucide-react";

const CATEGORY_OPTIONS: { value: NetWorthCategoryKey; label: string }[] = [
  { value: "property", label: "Property / House" },
  { value: "vehicle", label: "Vehicle / Car" },
  { value: "gold_jewelry", label: "Gold & Jewelry" },
  { value: "investment", label: "Investment" },
  { value: "intellectual_assets", label: "Intellectual & Income-generating Assets" },
  { value: "receivables_rights", label: "Receivables & Rights" },
  { value: "loan", label: "Loan / Debt" },
  { value: "other", label: "Other" },
];

function getCategoryLabel(key: NetWorthCategoryKey): string {
  return CATEGORY_OPTIONS.find((c) => c.value === key)?.label ?? key;
}

function getExpenseCategoryLabel(categoryId: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export default function NetWorthPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError: showSnackbar } = useSnackbar();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [adding, setAdding] = useState<"asset" | "liability" | null>(null);
  const [addingFromSuggestion, setAddingFromSuggestion] = useState<{
    categoryKey: NetWorthCategoryKey;
    type: NetWorthItemType;
    useType: NetWorthUseType;
    expenseLabel: string;
  } | null>(null);
  const [formCategory, setFormCategory] = useState<NetWorthCategoryKey>("other");
  const [formType, setFormType] = useState<NetWorthItemType>("asset");
  const [formUseType, setFormUseType] = useState<NetWorthUseType>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    const items = getNetWorthItems();
    setData((prev) => ({ items, expenseTotalsByCategory: prev?.expenseTotalsByCategory ?? [] }));
    loadExpenseTotalsForNetWorthSuggestions().then((totals) => {
      setData((prev) => (prev ? { ...prev, expenseTotalsByCategory: totals ?? [] } : null));
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
  }, [user, loading, router, load]);

  const expenseTotalByCategory = useCallback(
    (categoryId: string): number => {
      const row = data?.expenseTotalsByCategory.find((e) => e.category_id === categoryId);
      return row?.total_amount ?? 0;
    },
    [data]
  );

  const suggestions = NET_WORTH_DECLARABLE_EXPENSE_CATEGORIES.filter((decl) => {
    if (dismissedSuggestions.has(decl.expenseCategoryId)) return false;
    return expenseTotalByCategory(decl.expenseCategoryId) > 0;
  });

  const openAddFromSuggestion = (decl: (typeof NET_WORTH_DECLARABLE_EXPENSE_CATEGORIES)[number], type: NetWorthItemType, useType: NetWorthUseType) => {
    const expenseLabel = getExpenseCategoryLabel(decl.expenseCategoryId);
    setAddingFromSuggestion({
      categoryKey: decl.netWorthCategoryKey,
      type,
      useType,
      expenseLabel,
    });
    setFormCategory(decl.netWorthCategoryKey);
    setFormType(type);
    setFormUseType(useType);
    setFormName("");
    const total = expenseTotalByCategory(decl.expenseCategoryId);
    setFormAmount(total > 0 ? String(total) : "");
    setAdding("asset");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount.replace(/\D/g, "")) || 0;
    const amountCents = Math.round(amountNum * 100);
    if (amountCents <= 0) {
      showSnackbar("Enter a valid amount.");
      return;
    }
    setSaveStatus("saving");
    const currentItems = getNetWorthItems();
    const newItem: NetWorthItemRow = {
      id: generateNetWorthItemId(),
      type: formType,
      category_key: formCategory,
      name: formName.trim() || null,
      amount_cents: amountCents,
      currency: "PHP",
      use_type: formCategory === "vehicle" ? formUseType ?? null : null,
    };
    const updated = [...currentItems, newItem];
    saveNetWorthItems(updated);
    setData((prev) => (prev ? { ...prev, items: updated } : null));
    setAdding(null);
    setAddingFromSuggestion(null);
    setFormAmount("");
    setFormName("");
    setSaveStatus("idle");
  };

  const handleUpdate = (item: NetWorthItemRow) => {
    const amountNum = parseFloat(editAmount.replace(/\D/g, "")) || 0;
    const amountCents = Math.round(amountNum * 100);
    if (amountCents <= 0) return;
    setEditStatus("saving");
    const currentItems = getNetWorthItems();
    const updated = currentItems.map((i) =>
      i.id === item.id
        ? {
            ...i,
            name: editName.trim() || null,
            amount_cents: amountCents,
            use_type: item.category_key === "vehicle" ? item.use_type : null,
          }
        : i
    );
    saveNetWorthItems(updated);
    setData((prev) => (prev ? { ...prev, items: updated } : null));
    setEditingId(null);
    setEditStatus("idle");
  };

  const handleDelete = (itemId: string) => {
    const currentItems = getNetWorthItems();
    const updated = currentItems.filter((i) => i.id !== itemId);
    saveNetWorthItems(updated);
    setData((prev) => (prev ? { ...prev, items: updated } : null));
  };

  const assets = data?.items.filter((i) => i.type === "asset") ?? [];
  const liabilities = data?.items.filter((i) => i.type === "liability") ?? [];
  const totalAssets = assets.reduce((s, i) => s + i.amount_cents, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount_cents, 0);
  const netWorthCents = totalAssets - totalLiabilities;

  if (loading || !user) return null;

  return (
    <div className="container mx-auto max-w-4xl py-4">
      <h1 className="mb-2 text-2xl font-semibold">My Net Worth</h1>
      <p className="mb-4 text-muted-foreground">
        Track assets and liabilities. Property (e.g. house) is an asset; vehicles used for personal use are liabilities (they don’t generate income).
      </p>
      <div className="mb-6 flex gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          <strong className="text-foreground">Privacy note:</strong> Your net worth data is <strong>not stored in our database</strong>. It is saved only in this browser&apos;s local storage. Clearing your cache or using another device will reset it.
        </span>
      </div>

      {/* Status: only when user has both assets and liabilities */}
      {assets.length > 0 && liabilities.length > 0 && (
        <Card className={cn(
          "mb-6",
          netWorthCents >= 0
            ? "border-emerald-500/50 bg-emerald-500/10"
            : "border-amber-500/50 bg-amber-500/10"
        )}>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            {netWorthCents >= 0 ? (
              <>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <ThumbsUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">You are doing great</p>
                  <p className="text-sm text-muted-foreground">
                    Your assets outweigh your liabilities. Keep it up!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Frown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Oh no — you’re in debt</p>
                  <p className="text-sm text-muted-foreground">
                    Don’t worry, you can still fix your debt. Track your cashflow and chip away at liabilities over time.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions from expenses */}
      {suggestions.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              Add from your expenses
            </CardTitle>
            <CardDescription>
              You have expenses that can be declared as assets or liabilities. Houses are assets; for vehicles, choose based on use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((decl) => {
              const total = expenseTotalByCategory(decl.expenseCategoryId);
              const label = getExpenseCategoryLabel(decl.expenseCategoryId);
              return (
                <div
                  key={decl.expenseCategoryId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3"
                >
                  <div>
                    <p className="font-medium">
                      {label} — {formatCurrency(total)}
                    </p>
                    {decl.alwaysAsset ? (
                      <p className="text-sm text-muted-foreground">
                        Property is considered an asset. Add it to your assets?
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Was this for business or personal use? Personal use (e.g. family car) is a liability since it cannot generate income.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {decl.alwaysAsset ? (
                      <Button
                        size="sm"
                        onClick={() => openAddFromSuggestion(decl, "asset", null)}
                      >
                        Add as asset
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddFromSuggestion(decl, "asset", "business")}
                        >
                          Business (asset)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddFromSuggestion(decl, "liability", "personal")}
                        >
                          Personal (liability)
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDismissedSuggestions((prev) => new Set(prev).add(decl.expenseCategoryId))
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Net worth summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Total assets minus total liabilities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total assets</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(totalAssets / 100)}
            </span>
          </p>
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total liabilities</span>
            <span className="font-semibold text-rose-600">
              {formatCurrency(totalLiabilities / 100)}
            </span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Net worth</span>
            <span
              className={cn(
                netWorthCents >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCurrency(Math.abs(netWorthCents) / 100)}
              {netWorthCents < 0 && " (negative)"}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Add form (when adding from suggestion or manual) */}
      {(adding || addingFromSuggestion) && (
        <Card className="mb-6 border-dashed overflow-visible">
          <CardHeader>
            <CardTitle>
              {addingFromSuggestion
                ? `Add ${addingFromSuggestion.type} (${addingFromSuggestion.expenseLabel})`
                : `Add ${adding === "asset" ? "asset" : "liability"}`}
            </CardTitle>
            <CardDescription>
              Enter amount in whole units (e.g. 5000 for 5,000 PHP).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <form onSubmit={handleAdd} className="space-y-4 overflow-visible">
              {!addingFromSuggestion && (
                <>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(v) => setFormType(v as NetWorthItemType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 overflow-visible">
                    <Label>Category</Label>
                    <Select
                      value={formCategory}
                      onValueChange={(v) => setFormCategory(v as NetWorthCategoryKey)}
                    >
                      <SelectTrigger className="focus:ring-offset-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formCategory === "vehicle" && (
                    <div className="space-y-2">
                      <Label>Use</Label>
                      <Select
                        value={formUseType ?? ""}
                        onValueChange={(v) =>
                          setFormUseType(v === "" ? null : (v as NetWorthUseType))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select use" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">Business (asset)</SelectItem>
                          <SelectItem value="personal">Personal (liability)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  placeholder="e.g. Family car, Main house"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2 overflow-visible">
                <Label>Amount (PHP)</Label>
                <AmountInput
                  placeholder="0"
                  className="focus-visible:ring-offset-0"
                  value={formAmount}
                  onChange={setFormAmount}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saveStatus === "saving"}>
                  {saveStatus === "saving" ? "Saving…" : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAdding(null);
                    setAddingFromSuggestion(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assets list */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Assets
            </CardTitle>
            <CardDescription>Items that can generate income or hold value.</CardDescription>
          </div>
          {!adding && (
            <Button
              size="sm"
              onClick={() => {
                setAdding("asset");
                setAddingFromSuggestion(null);
                setFormType("asset");
                setFormCategory("other");
                setFormUseType(null);
                setFormName("");
                setFormAmount("");
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add asset
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet. Add one above or from suggestions.</p>
          ) : (
            <ul className="space-y-2 overflow-visible">
              {assets.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 overflow-visible",
                    editingId === item.id ? "p-2.5" : "p-2"
                  )}
                >
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2 w-full overflow-visible">
                      <Input
                        className="w-32 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                        placeholder="Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <AmountInput
                        className="w-24 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                        value={editAmount}
                        onChange={setEditAmount}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleUpdate(item)} disabled={editStatus === "saving"}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {item.category_key === "property" && <Home className="h-4 w-4 text-muted-foreground" />}
                        {item.category_key === "vehicle" && <Car className="h-4 w-4 text-muted-foreground" />}
                        {item.category_key !== "property" && item.category_key !== "vehicle" && (
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{item.name || getCategoryLabel(item.category_key)}</span>
                        {item.use_type && (
                          <span className="text-xs text-muted-foreground">({item.use_type})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(item.amount_cents / 100, item.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditName(item.name ?? "");
                            setEditAmount(String(item.amount_cents / 100));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Liabilities list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <Wallet className="h-5 w-5" />
              Liabilities
            </CardTitle>
            <CardDescription>Debts or items that don’t generate income (e.g. personal car).</CardDescription>
          </div>
          {!adding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding("liability");
                setAddingFromSuggestion(null);
                setFormType("liability");
                setFormCategory("other");
                setFormUseType(null);
                setFormName("");
                setFormAmount("");
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add liability
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {liabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No liabilities yet.</p>
          ) : (
            <ul className="space-y-2 overflow-visible">
              {liabilities.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 overflow-visible",
                    editingId === item.id ? "p-2.5" : "p-2"
                  )}
                >
                  {editingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2 w-full overflow-visible">
                      <Input
                        className="w-32 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                        placeholder="Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <AmountInput
                        className="w-24 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                        value={editAmount}
                        onChange={setEditAmount}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleUpdate(item)} disabled={editStatus === "saving"}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {item.category_key === "vehicle" && <Car className="h-4 w-4 text-muted-foreground" />}
                        {item.category_key === "loan" && <Wallet className="h-4 w-4 text-muted-foreground" />}
                        <span>{item.name || getCategoryLabel(item.category_key)}</span>
                        {item.use_type && (
                          <span className="text-xs text-muted-foreground">({item.use_type})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-rose-600">
                          {formatCurrency(item.amount_cents / 100, item.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditName(item.name ?? "");
                            setEditAmount(String(item.amount_cents / 100));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
