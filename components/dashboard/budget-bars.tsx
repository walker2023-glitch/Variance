import Link from "next/link";

import type { BudgetProgress } from "@/lib/spend";
import { budgetTone } from "@/lib/spend";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";

export function BudgetBars({ progress }: { progress: BudgetProgress[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Spending limits</CardTitle>
        <Link href="/budgets" className="text-xs font-medium text-primary hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.length === 0 ? (
          <EmptyState
            title="No limits set"
            description="Add a weekly total or per-category cap — they're visual only and never block an entry."
            action={
              <Link href="/budgets" className="text-sm font-medium text-primary underline">
                Set a limit
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          progress.map((b) => {
            const tone = budgetTone(b.percent);
            return (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {b.scope === "weekly_total" ? "This week" : b.category}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                    {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
                    {tone === "warn" && <Badge variant="warning">≥80%</Badge>}
                    {tone === "over" && <Badge variant="destructive">Over</Badge>}
                  </span>
                </div>
                <Progress
                  value={b.percent}
                  indicatorClassName={
                    tone === "over"
                      ? "bg-destructive"
                      : tone === "warn"
                        ? "bg-warning"
                        : "bg-primary"
                  }
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
