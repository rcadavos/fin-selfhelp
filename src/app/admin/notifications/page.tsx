"use client";

import { useState, useMemo } from "react";
import { Suspense } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminUsersQueryOptions } from "@/lib/query/admin-users";
import { sendAdminNotification } from "@/actions/admin";
import { type AdminUserRow } from "@/actions/admin";
import { Bell, Loader2, Search, CheckCheck, Users, CreditCard } from "lucide-react";

type Target = "all" | "subscribers" | "specific";

function isActiveSubscriber(u: AdminUserRow): boolean {
  if (u.is_subscriber) return true;
  if (u.subscription_tier === "pro" || u.subscription_tier === "premium") {
    const endsAt = u.subscription_ends_at ? new Date(u.subscription_ends_at) : null;
    return endsAt != null && endsAt > new Date();
  }
  return false;
}

function AdminNotificationsContent() {
  const [target, setTarget] = useState<Target>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: users } = useSuspenseQuery(adminUsersQueryOptions());

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const recipientCount = useMemo(() => {
    if (target === "all") return users.length;
    if (target === "subscribers") return users.filter(isActiveSubscriber).length;
    return selectedIds.size;
  }, [target, users, selectedIds]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredUsers.forEach((u) => next.delete(u.id));
      } else {
        filteredUsers.forEach((u) => next.add(u.id));
      }
      return next;
    });
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      const result = await sendAdminNotification({
        target,
        userIds: target === "specific" ? [...selectedIds] : undefined,
        title: title.trim(),
        body: body.trim(),
      });
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setSendError(null);
      setTitle("");
      setBody("");
      setSelectedIds(new Set());
      setSearch("");
      setTarget("all");
      setConfirmOpen(false);
    },
    onError: (err: Error) => {
      setSendError(err.message);
      setConfirmOpen(false);
    },
  });

  const canSend =
    title.trim().length > 0 &&
    recipientCount > 0 &&
    (target !== "specific" || selectedIds.size > 0);

  const targetOptions: { value: Target; label: string; description: string; icon: React.ElementType }[] = [
    {
      value: "all",
      label: "All users",
      description: `${users.length} user${users.length === 1 ? "" : "s"}`,
      icon: Users,
    },
    {
      value: "subscribers",
      label: "Subscribers only",
      description: `${users.filter(isActiveSubscriber).length} active subscriber${users.filter(isActiveSubscriber).length === 1 ? "" : "s"}`,
      icon: CreditCard,
    },
    {
      value: "specific",
      label: "Specific users",
      description: selectedIds.size > 0 ? `${selectedIds.size} selected` : "Pick from list",
      icon: CheckCheck,
    },
  ];

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Send Notification</CardTitle>
          </div>
          <CardDescription>
            Push an in-app notification to all users, active subscribers, or specific users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target selector */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {targetOptions.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={[
                    "flex flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                    target === value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {label}
                  </span>
                  <span className="text-xs">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User picker — only shown for "specific" */}
          {target === "specific" && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {filteredUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No users match.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleAllFiltered}
                            className="h-4 w-4 accent-primary"
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow
                          key={u.id}
                          className="cursor-pointer"
                          onClick={() => toggleUser(u.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(u.id)}
                              onChange={() => toggleUser(u.id)}
                              className="h-4 w-4 accent-primary"
                              aria-label={`Select ${u.email ?? u.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{u.email ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.full_name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActiveSubscriber(u) ? "default" : "secondary"} className="text-xs">
                              {isActiveSubscriber(u) ? (u.subscription_tier ?? "pro") : "free"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size} user{selectedIds.size === 1 ? "" : "s"} selected
                </p>
              )}
            </div>
          )}

          {/* Compose */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New feature available"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-body">Body <span className="text-muted-foreground">(optional)</span></Label>
              <textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Additional details…"
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          {sendError && <p className="text-sm text-destructive">{sendError}</p>}

          {lastResult && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Sent to {lastResult.sent} user{lastResult.sent === 1 ? "" : "s"}.
            </div>
          )}

          <Button
            className="w-full"
            disabled={!canSend}
            onClick={() => { setSendError(null); setConfirmOpen(true); }}
          >
            <Bell className="mr-2 h-4 w-4" />
            Send to {recipientCount} user{recipientCount === 1 ? "" : "s"}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
            <DialogDescription>
              This will deliver an in-app notification to{" "}
              <span className="font-medium text-foreground">
                {recipientCount} user{recipientCount === 1 ? "" : "s"}
              </span>
              . Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-sm font-medium">{title}</p>
            {body.trim() && <p className="text-sm text-muted-foreground">{body}</p>}
          </div>
          {sendError && <p className="text-sm text-destructive">{sendError}</p>}
          <DialogFooter className="pt-2">
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                className="w-1/2"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    }>
      <AdminNotificationsContent />
    </Suspense>
  );
}
