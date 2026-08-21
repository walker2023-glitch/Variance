import { createClient } from "@/lib/supabase/server";
import { cashFlowByMonth } from "@/lib/analytics";
import { attachBudgetProgress } from "@/lib/spend";
import { monthBounds, monthsAgoStart } from "@/lib/dates";
import type { Budget, FinancialGoal, Transaction } from "@/lib/types/database";
import { PageHeader } from "@/components/page-header";
import { HeroBalance } from "@/components/dashboard/hero-balance";
import { NeedsConfirmation } from "@/components/dashboard/needs-confirmation";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetBars } from "@/components/dashboard/budget-bars";
import { GoalProgress } from "@/components/dashboard/goal-progress";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const from = monthsAgoStart(5);
  const { from: monthStart, to: monthEnd } = monthBounds();

  const [
    { data: pending },
    { data: transactions },
    { data: budgets },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("status", "pending_confirmation")
      .order("transaction_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .eq("status", "confirmed")
      .gte("transaction_date", from)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("budgets").select("*").eq("is_active", true),
    supabase
      .from("financial_goals")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const txs = (transactions ?? []) as Transaction[];
  const cashFlow = cashFlowByMonth(txs);
  const progress = attachBudgetProgress((budgets ?? []) as Budget[], txs);

  const monthTxs = txs.filter(
    (t) => t.transaction_date >= monthStart && t.transaction_date <= monthEnd,
  );
  const incomeThisMonth = monthTxs
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenseThisMonth = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        eyebrow="Simple / Stable"
        title="Dashboard"
        description="One glance at where your money went — and where it's headed."
      />

      <HeroBalance
        netThisMonth={incomeThisMonth - expenseThisMonth}
        incomeThisMonth={incomeThisMonth}
        expenseThisMonth={expenseThisMonth}
        sparkline={cashFlow}
      />

      <NeedsConfirmation pending={(pending ?? []) as Transaction[]} />

      <BudgetBars progress={progress} />

      <div className="grid gap-5 lg:grid-cols-2">
        <CashFlowChart data={cashFlow} />
        <CategoryDonut transactions={txs} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GoalProgress goals={(goals ?? []) as FinancialGoal[]} />
        <RecentTransactions transactions={txs} />
      </div>
    </div>
  );
}
