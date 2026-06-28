// Tools the assistant can call to read the user's live financial data and to
// search their knowledge base on demand. Each tool runs server-side inside the
// chat route, so the existing server actions' RLS-scoped Supabase access applies.

import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadExpenseSummary } from "@/actions/budget";
import { loadAccounts, loadAccountBalances } from "@/actions/accounts";
import { loadGoals } from "@/actions/goals";
import { getMonthlyBreakdown } from "@/actions/expense-payments";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { retrieveContext } from "./retrieve";
import type { MatchedChunk } from "@/types/ai.types";

export function buildAssistantTools(
  supabase: SupabaseClient,
  profileId: string,
  /** Optional sink: chunks surfaced by searchKnowledgeBase are pushed here so the
   *  caller can include them in the answer's citations. */
  collectedChunks?: MatchedChunk[],
) {
  return {
    getFinancialSummary: tool({
      description:
        "Get the current month's financial summary: net take-home income, total monthly expenses, amount paid so far, and how many planned expenses are paid. Use for questions about budget, remaining money, or whether the user is on track this month.",
      inputSchema: z.object({}),
      execute: async () => {
        const summary = await loadExpenseSummary(getCurrentPaidMonth());
        if (!summary) return { available: false };
        const remaining = summary.netTakeHome - summary.totalMonthlyPaid;
        return {
          available: true,
          paidMonth: summary.paidMonth,
          netTakeHomeIncome: summary.netTakeHome,
          totalMonthlyExpenses: summary.totalMonthlyExpenses,
          totalPaidSoFar: summary.totalMonthlyPaid,
          remainingAfterPaid: remaining,
          plannedExpensesPaid: summary.paidCount,
          plannedExpensesTotal: summary.totalCount,
        };
      },
    }),

    getAccountBalances: tool({
      description:
        "List the user's accounts (bank, e-wallet, cash, etc.) with their current balances. Use for questions about how much money the user has, account totals, or net balance across accounts.",
      inputSchema: z.object({}),
      execute: async () => {
        const [{ accounts, error: accErr }, { balances, error: balErr }] =
          await Promise.all([loadAccounts(), loadAccountBalances()]);
        if (accErr || balErr) return { available: false };
        const rows = accounts.map((a) => ({
          name: a.account_alias,
          institution: a.bank_name,
          balance: balances[a.id] ?? 0,
        }));
        const total = rows.reduce((sum, r) => sum + r.balance, 0);
        return { available: true, accounts: rows, totalBalance: total };
      },
    }),

    getGoals: tool({
      description:
        "List the user's savings goals with target amount, amount saved so far, and progress. Use for questions about goals, savings targets, or progress toward a goal.",
      inputSchema: z.object({}),
      execute: async () => {
        const { goals, error } = await loadGoals();
        if (error) return { available: false };
        return {
          available: true,
          goals: goals.map((g) => ({
            name: g.name,
            type: g.goal_type,
            target: g.target_amount,
            saved: g.total_deposited,
            progressPct:
              g.target_amount && g.target_amount > 0
                ? Math.round((g.total_deposited / g.target_amount) * 100)
                : null,
            achieved:
              g.date_achieved_month != null && g.date_achieved_year != null,
          })),
        };
      },
    }),

    getSpendingTrend: tool({
      description:
        "Get total expenses per month for the last few months. Use for questions about spending trends, whether spending went up or down, or month-over-month comparisons.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("How many recent months to include (default 6)."),
      }),
      execute: async ({ months }) => {
        const res = await getMonthlyBreakdown(months ?? 6);
        if (res.error) return { available: false };
        return { available: true, months: res.stats ?? [] };
      },
    }),

    searchKnowledgeBase: tool({
      description:
        "Search the user's uploaded documents and notes for relevant passages. Use when the question may be answered by a document the user added (statements, contracts, policies, notes), beyond what's already in context.",
      inputSchema: z.object({
        query: z.string().min(1).describe("A focused search query."),
      }),
      execute: async ({ query }) => {
        const { chunks } = await retrieveContext(supabase, profileId, query);
        if (collectedChunks) collectedChunks.push(...chunks);
        return {
          results: chunks.map((c) => ({
            source: c.document_title,
            content: c.content,
            similarity: Number(c.similarity.toFixed(3)),
          })),
        };
      },
    }),
  };
}
