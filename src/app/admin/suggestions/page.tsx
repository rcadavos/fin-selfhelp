"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSuggestionsForAdmin, type SuggestionForAdminRow } from "@/actions/feedback";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function AdminSuggestionsPage() {
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ["fin-selfhelp", "admin", "suggestions"],
    queryFn: async () => {
      const res = await getSuggestionsForAdmin();
      if (res.error) throw new Error(res.error);
      return res.suggestions;
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Admin
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
          <CardDescription>
            User suggestions from the footer. Read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">
              {(error as Error).message}
            </p>
          )}
          {suggestions.length === 0 && !error ? (
            <p className="text-muted-foreground">No suggestions yet.</p>
          ) : (
            <ul className="space-y-4">
              {(suggestions as SuggestionForAdminRow[]).map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border bg-muted/20 p-4 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    {s.email && (
                      <span className="font-medium text-foreground">{s.email}</span>
                    )}
                    <span>{formatDate(s.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
