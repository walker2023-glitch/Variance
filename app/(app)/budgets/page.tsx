import { createClient } from "@/lib/supabase/server";
import { attachBudgetProgress } from "@/lib/spend";
import { monthBounds, weekBounds } from "@/lib/dates";
import type { Budget, Transaction } from "@/lib/types/database";
import { PageHeader } from "@/components/page-header";
import { BudgetManager } from "@/components/budgets/budget-manager";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const week = weekBounds();
  const month = monthBounds();
  const from = week.from < month.from ? week.from : month.from;
  const to = week.to > month.to ? week.to : month.to;

  const [{ data: budgets }, { data: txs }] = await Promise.all([
    supabase.from("budgets").select("*").order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .eq("status", "confirmed")
      .eq("type", "expense")
      .gte("transaction_date", from)
      .lte("transaction_date", to),
  ]);

  const list = (budgets ?? []) as Budget[];
  const progress = attachBudgetProgress(list, (txs ?? []) as Transaction[]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Budgets"
        description="Weekly total and per-category spending limits. Passive indicators only — they never block an entry."
      />
      <BudgetManager budgets={list} progress={progress} />
    </div>
  );
}
