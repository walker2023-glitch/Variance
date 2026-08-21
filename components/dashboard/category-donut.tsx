"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  categoryBreakdown,
  rangeBounds,
  type RangeKey,
} from "@/lib/analytics";
import { CHART_SERIES } from "@/lib/chart-theme";
import type { Transaction } from "@/lib/types/database";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "ytd", label: "Year to date" },
];

export function CategoryDonut({ transactions }: { transactions: Transaction[] }) {
  const [range, setRange] = useState<RangeKey>("month");
  const { from, to } = rangeBounds(range);
  const slices = useMemo(
    () => categoryBreakdown(transactions, from, to),
    [transactions, from, to],
  );
  const total = slices.reduce((s, x) => s + x.amount, 0);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div>
          <p className="label-caps mb-1">Breakdown</p>
          <CardTitle className="font-display text-lg font-semibold">
            By category
          </CardTitle>
        </div>
        <div
          role="radiogroup"
          aria-label="Time range"
          className="flex flex-wrap gap-1.5"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <EmptyState
            title="No expenses in this range"
            className="border-0 py-8"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-48 w-48 shrink-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {slices.map((_, i) => (
                      <Cell
                        key={slices[i].category}
                        fill={CHART_SERIES[i % CHART_SERIES.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 text-sm">
              {slices.map((s, i) => (
                <li key={s.category} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CHART_SERIES[i % CHART_SERIES.length] }}
                    />
                    {s.category}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(s.amount)}
                    {total > 0
                      ? ` (${Math.round((s.amount / total) * 100)}%)`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
            <table className="sr-only">
              <caption>Category spending {from} to {to}</caption>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((s) => (
                  <tr key={s.category}>
                    <td>{s.category}</td>
                    <td>{formatCurrency(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
