"use client";

import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AccountSelect } from "@/components/app/account-select";
import { addExpense } from "@/actions/budget";
import { createAccountExpense } from "@/actions/account-transactions";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions, accountBalancesQueryOptions, invalidateAccountQueries } from "@/lib/query/accounts";
import { vehiclesQueryOptions, invalidateVehicleQueriesIfTransportAffected } from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { VEHICLE_EXPENSE_CATEGORIES } from "@/lib/constants/vehicle-categories";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function AddExpenseDialog({
  open,
  onClose,
  initialAccountId,
  initialCategory,
  initialVehicleId,
}: {
  open: boolean;
  onClose: () => void;
  initialAccountId?: string;
  initialCategory?: string;
  initialVehicleId?: string;
}) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions());
  const { data: balances = {} } = useQuery(accountBalancesQueryOptions());

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayYmd);
  const [accountId, setAccountId] = useState(initialAccountId ?? "");
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setCategory(initialCategory ?? "");
      setNote("");
      setDate(todayYmd());
      setAccountId(initialAccountId ?? "");
      setVehicleId(initialVehicleId ?? "");
      setVehicleCategory("");
      setError(null);
    }
  }, [open, initialAccountId, initialCategory, initialVehicleId]);

  const parsedAmt = parseFloat(amount);
  const selectedBalance = accountId ? (balances[accountId] ?? 0) : null;
  const insufficientBalance =
    !!accountId &&
    Number.isFinite(parsedAmt) &&
    parsedAmt > 0 &&
    selectedBalance !== null &&
    parsedAmt > selectedBalance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const amt = parseFloat(amount);
    if (!trimmedName || isNaN(amt) || amt <= 0) {
      setError("Please enter a name and a valid amount.");
      return;
    }
    if (!accountId) {
      setError("Please select an account.");
      return;
    }
    if (insufficientBalance) {
      setError("Insufficient account balance.");
      return;
    }
    if (vehicleId && !vehicleCategory) {
      setError("Please select a vehicle category.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addExpense(
      category || "other",
      amt,
      trimmedName,
      note.trim() || null,
      date,
      accountId,
      vehicleId || null,
      vehicleCategory || null,
    );
    if (res.error) {
      setSaving(false);
      setError(res.error);
      return;
    }
    const txRes = await createAccountExpense({ accountId, amount: amt, description: trimmedName, occurredAt: date });
    if (txRes.error) {
      setSaving(false);
      setError(txRes.error);
      return;
    }
    invalidateAccountQueries(queryClient);
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
    invalidateVehicleQueriesIfTransportAffected(queryClient, category || "other");
    onClose();
  }

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollFadeBody className="space-y-5 px-6 pb-4">

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-amount">Amount</Label>
                <AmountInput
                  id="add-exp-amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="₱0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-name">Name</Label>
                <Input
                  id="add-exp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                />
              </div>
            </div>

            {accounts.length > 0 ? (
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-account">Account</Label>
                <AccountSelect
                  id="add-exp-account"
                  accounts={accounts}
                  value={accountId}
                  onChange={setAccountId}
                />
                {insufficientBalance && (
                  <p className="text-xs text-destructive">
                    Insufficient balance. Available: ₱{(selectedBalance ?? 0).toFixed(2)}
                    {" "}
                    <Link
                      href="/dashboard/accounts"
                      className="font-semibold underline underline-offset-2 hover:no-underline"
                      onClick={onClose}
                    >
                      Go to Accounts
                    </Link>
                  </p>
                )}
                {accountId && !insufficientBalance && selectedBalance !== null && (
                  <p className="text-xs text-muted-foreground">
                    Available: ₱{selectedBalance.toFixed(2)}
                  </p>
                )}
              </div>
            ) : (
              <p className="surface border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No accounts found. Create an account first to track expenses.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="add-exp-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-date">Date</Label>
                <DatePicker
                  id="add-exp-date"
                  value={date}
                  onChange={setDate}
                  formatDisplay={formatShortDate}
                />
              </div>
            </div>

            {category === "transport" && vehicles.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="add-exp-vehicle">Vehicle (optional)</Label>
                  <Select
                    value={vehicleId || "_none"}
                    onValueChange={(v) => { setVehicleId(v === "_none" ? "" : v); setVehicleCategory(""); }}
                  >
                    <SelectTrigger id="add-exp-vehicle">
                      <SelectValue placeholder="Link to a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— None —</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}{v.plate_number ? ` (${v.plate_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {vehicleId && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="add-exp-vehicle-cat">
                      Vehicle Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={vehicleCategory} onValueChange={setVehicleCategory}>
                      <SelectTrigger id="add-exp-vehicle-cat">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="add-exp-note">Note</Label>
              <textarea
                id="add-exp-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </ScrollFadeBody>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11 [&_[data-size=icon]]:w-11">
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="w-1/2" disabled={saving || !name.trim() || !amount || !accountId || insufficientBalance}>
                {saving ? "Saving…" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </FormPanel>
  );
}
