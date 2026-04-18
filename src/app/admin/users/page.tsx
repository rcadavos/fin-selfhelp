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
import { confirmUserEmail, setUserSubscription, setUserAdmin, type AdminUserRow } from "@/actions/admin";
import { Loader2, CreditCard, Shield, ShieldOff, MailCheck, UserRoundX } from "lucide-react";

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
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Free, paid Pro, or paid Premium. Active Pro or Premium unlocks product features; only users on recurring
            billing can submit reviews and suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{(error as Error).message}</p>
          )}
          {users.length === 0 && !error ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Signed up</TableHead>
                  <TableHead className="text-right">Last login</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                  <TableHead className="text-right w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const status = subscriptionStatus(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.last_login_at)}
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
                            onClick={() => setAdminMutation.mutate({ userId: u.id, isAdmin: !u.is_admin })}
                            disabled={setAdminMutation.isPending}
                            aria-label={u.is_admin ? "Remove admin" : "Make admin"}
                          >
                            {setAdminMutation.isPending && setAdminMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.is_admin ? (
                              <>
                                <ShieldOff className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSetPaid(u)}
                            aria-label="Set paid plan"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFreeMutation.mutate({ userId: u.id })}
                            disabled={setFreeMutation.isPending}
                            aria-label="Make free"
                          >
                            {setFreeMutation.isPending && setFreeMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserRoundX className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmEmailMutation.mutate({ userId: u.id })}
                            disabled={confirmEmailMutation.isPending}
                            aria-label="Confirm email"
                          >
                            {confirmEmailMutation.isPending && confirmEmailMutation.variables?.userId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <MailCheck className="h-4 w-4" />
                              </>
                            )}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidUser(null)}>
              Cancel
            </Button>
            <Button onClick={submitSetPaid} disabled={!expiresAt.trim() || setPaidMutation.isPending}>
              {setPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
