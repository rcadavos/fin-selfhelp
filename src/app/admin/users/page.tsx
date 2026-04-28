"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUsersQueryOptions } from "@/lib/query/admin-users";
import { confirmUserEmail, setUserSubscription, setUserAdmin, deleteUser, type AdminUserRow } from "@/actions/admin";
import { Loader2, CreditCard, Shield, ShieldOff, MailCheck, UserRoundX, Trash2, Search } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function subscriptionStatus(row: AdminUserRow): {
  label: string;
  variant: "secondary" | "default" | "destructive" | "outline";
} {
  const now = new Date();
  const endsAt = row.subscription_ends_at ? new Date(row.subscription_ends_at) : null;
  const hasAccess = (endsAt != null && endsAt > now) || row.is_subscriber;
  if (!hasAccess) {
    if (endsAt != null && endsAt < now) return { label: "Expired", variant: "destructive" };
    return { label: "Free", variant: "secondary" };
  }
  if (row.subscription_tier === "premium") {
    return { label: "Premium", variant: "default" };
  }
  if (!row.is_subscriber) return { label: "Pro", variant: "outline" };
  return { label: "Pro", variant: "default" };
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery(adminUsersQueryOptions());
  const [paidUser, setPaidUser] = useState<AdminUserRow | null>(null);
  const [paidTier, setPaidTier] = useState<"pro" | "premium">("pro");
  const [expiresAt, setExpiresAt] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [search, setSearch] = useState("");

  const setAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const result = await setUserAdmin(userId, isAdmin);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const setPaidMutation = useMutation({
    mutationFn: async ({
      userId,
      expiresAt: date,
      tier,
    }: {
      userId: string;
      expiresAt: string;
      tier: "pro" | "premium";
    }) => {
      const result = await setUserSubscription(userId, tier, date);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
      setPaidUser(null);
      setExpiresAt("");
      setPaidTier("pro");
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const setFreeMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const result = await setUserSubscription(userId, "free");
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const confirmEmailMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const result = await confirmUserEmail(userId);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const result = await deleteUser(userId);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
      setDeleteTarget(null);
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message);
      setDeleteTarget(null);
    },
  });

  const filteredUsers = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        return (
          u.email?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q)
        );
      })
    : users;

  function openSetPaid(row: AdminUserRow) {
    setPaidUser(row);
    setPaidTier(row.subscription_tier === "premium" ? "premium" : "pro");
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);
    setExpiresAt(defaultEnd.toISOString().slice(0, 10));
    setActionError(null);
  }

  function submitSetPaid() {
    if (!paidUser || !expiresAt.trim()) return;
    setPaidMutation.mutate({ userId: paidUser.id, expiresAt: expiresAt.trim(), tier: paidTier });
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription className="mt-1">
                Free, paid Pro, or paid Premium. Active Pro or Premium unlocks product features; only users on recurring
                billing can submit reviews and suggestions.
              </CardDescription>
            </div>
            <span className="shrink-0 text-sm font-medium text-muted-foreground sm:pt-0.5">
              {users.length} total
            </span>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{(error as Error).message}</p>
          )}
          {users.length === 0 && !error ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground">No users match &ldquo;{search}&rdquo;.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead className="text-right">Signed up</TableHead>
                  <TableHead className="text-right">Last login</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                  <TableHead className="text-right w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const status = subscriptionStatus(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.full_name ?? "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.last_login_at)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.email_confirmed_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {u.is_admin && <Badge variant="secondary">Admin</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {u.subscription_ends_at ? formatDate(u.subscription_ends_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-nowrap justify-end gap-1 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            title={u.is_admin ? "Remove admin" : "Make admin"}
                            aria-label={u.is_admin ? "Remove admin" : "Make admin"}
                            onClick={() => setAdminMutation.mutate({ userId: u.id, isAdmin: !u.is_admin })}
                            disabled={setAdminMutation.isPending}
                          >
                            {setAdminMutation.isPending && setAdminMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.is_admin ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Set paid plan"
                            aria-label="Set paid plan"
                            onClick={() => openSetPaid(u)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Revert to free plan"
                            aria-label="Revert to free plan"
                            onClick={() => setFreeMutation.mutate({ userId: u.id })}
                            disabled={setFreeMutation.isPending}
                          >
                            {setFreeMutation.isPending && setFreeMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserRoundX className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Confirm email"
                            aria-label="Confirm email"
                            onClick={() => confirmEmailMutation.mutate({ userId: u.id })}
                            disabled={confirmEmailMutation.isPending}
                          >
                            {confirmEmailMutation.isPending && confirmEmailMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MailCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Delete user"
                            aria-label="Delete user"
                            onClick={() => setDeleteTarget(u)}
                            disabled={deleteUserMutation.isPending}
                            className="text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.email ?? "this user"}</span>?
              All their data will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="w-1/2"
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteTarget && deleteUserMutation.mutate({ userId: deleteTarget.id })}
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paidUser} onOpenChange={(open) => !open && setPaidUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set paid subscription</DialogTitle>
            <DialogDescription>
              {paidUser?.email ?? "User"} — choose Pro or Premium and an access end date. Either can submit reviews
              while recurring billing is on.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="paid-tier">Plan</Label>
              <Select value={paidTier} onValueChange={(v) => setPaidTier(v as "pro" | "premium")}>
                <SelectTrigger id="paid-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium (extra modules)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires-at">Expires at</Label>
              <DatePicker
                id="expires-at"
                value={expiresAt}
                onChange={setExpiresAt}
                placeholder="Expiration date"
              />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setPaidUser(null)}>
                Cancel
              </Button>
              <Button className="w-1/2" onClick={submitSetPaid} disabled={!expiresAt.trim() || setPaidMutation.isPending}>
                {setPaidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
