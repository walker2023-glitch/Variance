import Link from "next/link";

import type { FinancialGoal } from "@/lib/types/database";
import { asNumber, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";

export function GoalProgress({ goals }: { goals: FinancialGoal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Goals</CardTitle>
        <Link href="/goals" className="text-xs font-medium text-primary hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Track progress toward a savings target."
            action={
              <Link href="/goals" className="text-sm font-medium text-primary underline">
                Create a goal
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          goals.map((g) => {
            const current = asNumber(g.current_amount);
            const target = asNumber(g.target_amount);
            const percent = target > 0 ? (current / target) * 100 : 0;
            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(current)} / {formatCurrency(target)}
                  </span>
                </div>
                <Progress value={percent} />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
