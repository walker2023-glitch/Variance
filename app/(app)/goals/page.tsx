import { createClient } from "@/lib/supabase/server";
import type { FinancialGoal } from "@/lib/types/database";
import { PageHeader } from "@/components/page-header";
import { GoalManager } from "@/components/goals/goal-manager";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_goals")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Goals"
        description="Savings targets with a manual current amount. Auto-accrual from tagged deposits is deferred to v1.1."
      />
      <GoalManager goals={(data ?? []) as FinancialGoal[]} />
    </div>
  );
}
