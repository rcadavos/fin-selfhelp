"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { BudgetToolSection } from "@/components/landing/budget-tool-section";
import { Footer } from "@/components/landing/footer";
import { IncomeForm } from "@/components/landing/income-form";
import { ExpensesForm } from "@/components/landing/expenses-form";
import { BudgetStatusCard } from "@/components/landing/budget-status-card";
import {
  getInitialBudgetState,
  computeBudgetSummary,
} from "@/lib/budget";
import { loadBudget, saveBudget } from "@/actions/budget";
import { useUser } from "@/hooks/use-user";
import type { BudgetState, ExpenseCategoryKey } from "@/types/database.types";

type Step = "hero" | "income" | "expenses" | "result";

export default function HomePage() {
  const { user } = useUser();
  const [step, setStep] = useState<Step>("hero");
  const [state, setState] = useState(getInitialBudgetState);
  const [toolActive, setToolActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadBudget().then((loaded) => {
      if (loaded) {
        setState(loaded);
        setToolActive(true);
        setStep("income");
      }
    });
  }, [user]);

  const handleGetStarted = useCallback(() => {
    setToolActive(true);
    setStep("income");
  }, []);

  const handleNetTakeHomeChange = useCallback((value: number) => {
    setState((prev) => ({ ...prev, netTakeHome: value }));
  }, []);

  const handleExpenseChange = useCallback(
    (category: ExpenseCategoryKey, value: number) => {
      setState((prev) => ({
        ...prev,
        expenses: { ...prev.expenses, [category]: value },
      }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setState(getInitialBudgetState());
    setStep("income");
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaveStatus("saving");
    setSaveError(null);
    const result = await saveBudget(state);
    if (result.error) {
      setSaveError(result.error);
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [user, state]);

  const summary = computeBudgetSummary(state);

  return (
    <main className="min-h-screen bg-background">
      <Header onGetStarted={handleGetStarted} />

      <HeroSection onGetStarted={handleGetStarted} />

      <FeaturesSection />

      <HowItWorksSection />

      <BudgetToolSection isActive={toolActive} isLoggedIn={!!user}>
        {step === "income" && (
          <IncomeForm
            netTakeHome={state.netTakeHome}
            onNetTakeHomeChange={handleNetTakeHomeChange}
            onNext={() => setStep("expenses")}
            onSave={user ? handleSave : undefined}
            saveStatus={saveStatus}
            saveError={saveError}
            className="mx-auto max-w-xl"
          />
        )}

        {step === "expenses" && (
          <ExpensesForm
            expenses={state.expenses}
            onExpenseChange={handleExpenseChange}
            onBack={() => setStep("income")}
            onSubmit={() => setStep("result")}
            onSave={user ? handleSave : undefined}
            saveStatus={saveStatus}
            saveError={saveError}
            className="mx-auto"
          />
        )}

        {step === "result" && (
          <BudgetStatusCard
            summary={summary}
            onReset={handleReset}
            onSave={user ? handleSave : undefined}
            saveStatus={saveStatus}
            saveError={saveError}
            className="mx-auto max-w-xl"
          />
        )}

        {step === "hero" && (
          <div className="rounded-lg border border-dashed bg-muted/30 py-16 text-center text-muted-foreground">
            {user
              ? "Your saved budget is loaded. Edit above or start a new one."
              : "Click “Start fixing your financial trouble” above to begin. Log in to save your data."}
          </div>
        )}
      </BudgetToolSection>

      <Footer />
    </main>
  );
}
