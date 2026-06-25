"use client";

import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
import { updateExpense, type ExpenseEntryRow } from "@/actions/budget";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions } from "@/lib/query/accounts";
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

export function EditExpenseDialog({
  entry,
  onClose,
  onDelete,
}: {
  entry: ExpenseEntryRow | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions());

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayYmd);
  const [accountId, setAccountId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setName(entry.note?.trim() || "");
    setAmount(String(entry.amount));
    setCategory(entry.category_id && entry.category_id !== "other" ? entry.category_id : "");
    setNote(entry.notes?.trim() || "");
    setDate(entry.created_at ? entry.created_at.slice(0, 10) : todayYmd());
    setAccountId(entry.account_id ?? "");
    setVehicleId(entry.vehicle_id ?? "");
    setVehicleCategory(entry.vehicle_category ?? "");
    setError(null);
  }, [entry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
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
    if (vehicleId && !vehicleCategory) {
      setError("Please select a vehicle category.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await updateExpense(
      entry.id,
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
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
    invalidateVehicleQueriesIfTransportAffected(queryClient, entry.category_id, category || "other");
    onClose();
  }

  return (
    <FormPanel open={!!entry} onOpenChange={(v) => !v && onClose()}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollFadeBody className="space-y-4 px-6 pb-4">

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-exp-amount">Amount</Label>
                <AmountInput
                  id="edit-exp-amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="₱0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-exp-name">Name</Label>
                <Input
                  id="edit-exp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                />
              </div>
            </div>

            {accounts.length > 0 ? (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-exp-account">Account</Label>
                <AccountSelect
                  id="edit-exp-account"
                  accounts={accounts}
                  value={accountId}
                  onChange={setAccountId}
                />
              </div>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No accounts found.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-exp-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="edit-exp-category">
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
                <Label htmlFor="edit-exp-date">Date</Label>
                <DatePicker
                  id="edit-exp-date"
                  value={date}
                  onChange={setDate}
                  formatDisplay={formatShortDate}
                />
              </div>
            </div>

            {category === "transport" && vehicles.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-exp-vehicle">Vehicle (optional)</Label>
                  <Select
                    value={vehicleId || "_none"}
                    onValueChange={(v) => { setVehicleId(v === "_none" ? "" : v); setVehicleCategory(""); }}
                  >
                    <SelectTrigger id="edit-exp-vehicle">
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
                    <Label htmlFor="edit-exp-vehicle-cat">
                      Vehicle Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={vehicleCategory} onValueChange={setVehicleCategory}>
                      <SelectTrigger id="edit-exp-vehicle-cat">
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
              <Label htmlFor="edit-exp-note">Note</Label>
              <textarea
                id="edit-exp-note"
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
              {onDelete && entry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-none rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Delete expense"
                  onClick={() => { onClose(); onDelete(entry.id); }}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !name.trim() || !amount || !accountId}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </FormPanel>
  );
}
