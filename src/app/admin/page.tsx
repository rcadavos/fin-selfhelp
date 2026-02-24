"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminUsersQueryOptions } from "@/lib/query/admin-users";
import { setUserSubscription, type AdminUserRow } from "@/actions/admin";
import { Loader2, UserMinus, CreditCard } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function subscriptionStatus(row: AdminUserRow): { label: string; variant: "secondary" | "default" | "destructive" } {
  const now = new Date();
  const endsAt = row.subscription_ends_at ? new Date(row.subscription_ends_at) : null;
  const hasProAccess = (endsAt != null && endsAt > now) || row.is_subscriber;
  if (!hasProAccess) return { label: "Free", variant: "secondary" };
  if (endsAt && endsAt < now) return { label: "Expired", variant: "destructive" };
  return { label: "Pro", variant: "default" };
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery(adminUsersQueryOptions());
  const [paidUser, setPaidUser] = useState<AdminUserRow | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const setFreeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await setUserSubscription(userId, "free");
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const setPaidMutation = useMutation({
    mutationFn: async ({ userId, expiresAt: date }: { userId: string; expiresAt: string }) => {
      const result = await setUserSubscription(userId, "paid", date);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryOptions().queryKey });
      setPaidUser(null);
      setExpiresAt("");
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  function openSetPaid(row: AdminUserRow) {
    setPaidUser(row);
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);
    setExpiresAt(defaultEnd.toISOString().slice(0, 10));
    setActionError(null);
  }

  function submitSetPaid() {
    if (!paidUser || !expiresAt.trim()) return;
    setPaidMutation.mutate({ userId: paidUser.id, expiresAt: expiresAt.trim() });
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
            Subscription status and expiry. Set users to free or paid (with expiry date).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">
              {(error as Error).message}
            </p>
          )}
          {users.length === 0 && !error ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Signed up</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                  <TableHead className="text-right w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const status = subscriptionStatus(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {u.subscription_ends_at
                          ? formatDate(u.subscription_ends_at)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFreeMutation.mutate(u.id)}
                            disabled={setFreeMutation.isPending}
                          >
                            {setFreeMutation.isPending && setFreeMutation.variables === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="h-4 w-4 mr-1" />
                                Free
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSetPaid(u)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Paid
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
            <DialogTitle>Set to paid (Pro)</DialogTitle>
            <DialogDescription>
              {paidUser?.email ?? "User"} — choose an expiry date for Pro access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expires-at">Expires at</Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaidUser(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitSetPaid}
              disabled={!expiresAt.trim() || setPaidMutation.isPending}
            >
              {setPaidMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Set paid"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to My budget</Link>
        </Button>
      </div>
    </main>
  );
}
