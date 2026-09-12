"use client";

import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ContentHeader } from "@/components/app/content-header";
import { adminReferralStatsQueryOptions } from "@/lib/query/referrals";
import {
  REFERRAL_SIGNUPS_PER_REWARD,
  REFERRAL_TAGLINE,
} from "@/lib/constants/referral";
import { Search } from "lucide-react";

/**
 * Same mm/dd/yy shape as the other admin tables, but read in UTC: this board is
 * server-prefetched, so local getters would render a different day on a UTC
 * server than in a UTC+8 browser and trip a hydration mismatch.
 */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

const SUMMARY_CELLS = [
  { key: "referrers", label: "Referrers", hint: "Accounts with at least one referral" },
  { key: "signups", label: "Referred signups", hint: "Confirmed accounts from invite links" },
  { key: "conversions", label: "Upgraded to paid", hint: "Referred friends now subscribing" },
  { key: "monthsGranted", label: "Free months granted", hint: "Total Pro months paid out" },
] as const;

export function AdminReferralsBoard() {
  const { data: stats } = useSuspenseQuery(adminReferralStatsQueryOptions());
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stats.rows;
    return stats.rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.referralCode ?? "").toLowerCase().includes(q)
    );
  }, [stats.rows, search]);

  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <ContentHeader
        title="Referrals"
        subtitle={REFERRAL_TAGLINE}
        className="mb-0"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_CELLS.map(({ key, label, hint }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.totals[key]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Referral counts by user</CardTitle>
              <CardDescription>
                Every {REFERRAL_SIGNUPS_PER_REWARD} signups and every paid upgrade grants the
                referrer one free month of Pro.
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, or code"
                className="pl-9"
                aria-label="Search referrers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.rows.length === 0 ? (
            <p className="text-muted-foreground">No referrals yet.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-muted-foreground">No referrers match &ldquo;{search}&rdquo;.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Upgraded</TableHead>
                  <TableHead className="text-right">Months granted</TableHead>
                  <TableHead className="text-right">Last referral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <span className="block font-medium">{row.email}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.fullName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-full bg-muted px-2 py-1 font-mono text-xs">
                        {row.referralCode ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.signupCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.convertedCount > 0 ? (
                        <Badge variant="success">{row.convertedCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.monthsGranted}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(row.lastReferralAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
