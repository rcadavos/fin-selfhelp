"use client";

import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { addExpense } from "@/actions/budget";
import { createAccountExpense } from "@/actions/account-transactions";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions, accountBalancesQueryOptions, invalidateAccountQueries } from "@/lib/query/accounts";
import { vehiclesQueryOptions, invalidateVehicleQueriesIfTransportAffected } from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { VEHICLE_EXPENSE_CATEGORIES } from "@/lib/constants/vehicle-categories";
import { getBankLogoSlug } from "@/lib/constants/account-institutions";

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
}: {
  open: boolean;
  onClose: () => void;
  initialAccountId?: string;
}) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions());
  const { data: balances = {} } = useQuery(accountBalancesQueryOptions());

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayYmd);
  const [accountId, setAccountId] = useState(initialAccountId ?? "");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setCategory("");
      setNote("");
      setDate(todayYmd());
      setAccountId(initialAccountId ?? "");
      setVehicleId("");
      setVehicleCategory("");
      setError(null);
    }
  }, [open, initialAccountId]);

  const parsedAmt = parseFloat(amount);
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
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
      null, null,
      "monthly",
      "both",
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

  const selectedLogoSlug = selectedAccount ? getBankLogoSlug(selectedAccount.bank_name) : null;
  const sortedAccounts = [...accounts].sort((a, b) =>
    a.account_alias.toLowerCase() === "cash" ? -1 : b.account_alias.toLowerCase() === "cash" ? 1 : 0
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined} className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollFadeBody className="space-y-4 px-6 pb-4">

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-name">Name</Label>
                <Input
                  id="add-exp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-amount">Amount</Label>
                <Input
                  id="add-exp-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₱0"
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {accounts.length > 0 ? (
              <div className="grid gap-1.5">
                <Label htmlFor="add-exp-account">Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="add-exp-account" className="h-auto min-h-10 py-2">
                    {selectedAccount ? (
                      <div className="flex min-w-0 items-center gap-2">
                        {selectedLogoSlug ? (
                          <Image src={`/images/bank-logo/${selectedLogoSlug}.webp`} alt={selectedAccount.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                        ) : (
                          <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: selectedAccount.color }} />
                        )}
                        <span className="truncate text-sm font-medium">{selectedAccount.account_alias}</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select account" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {sortedAccounts.map((acc) => {
                      const logoSlug = getBankLogoSlug(acc.bank_name);
                      return (
                        <SelectItem key={acc.id} value={acc.id} className="py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {logoSlug ? (
                              <Image src={`/images/bank-logo/${logoSlug}.webp`} alt={acc.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                            ) : (
                              <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: acc.color }} />
                            )}
                            <span className="truncate text-sm">{acc.account_alias}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {insufficientBalance && (
                  <p className="text-xs text-destructive">
                    Insufficient balance. Available: ₱{(selectedBalance ?? 0).toFixed(2)}
                  </p>
                )}
                {accountId && !insufficientBalance && selectedBalance !== null && (
                  <p className="text-xs text-muted-foreground">
                    Available: ₱{selectedBalance.toFixed(2)}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No accounts found. Create an account first to track expenses.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-3 sm:grid-cols-2">
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
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </ScrollFadeBody>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
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
      </DialogContent>
    </Dialog>
  );
}
