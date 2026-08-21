import Link from "next/link";

import type { Transaction } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const recent = transactions.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            title="Log your first expense"
            description="Open Quick Entry and save an amount + category. It'll show up here."
            action={
              <Link href="/" className="text-sm font-medium text-primary underline">
                Go to Quick Entry
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          <ul className="divide-y">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {t.merchant || t.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.transaction_date} · {t.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.type === "deposit" ? "success" : "secondary"}>
                    {t.type}
                  </Badge>
                  <span
                    className={
                      t.type === "deposit"
                        ? "tabular-nums font-medium text-success"
                        : "tabular-nums font-medium"
                    }
                  >
                    {t.type === "deposit" ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
