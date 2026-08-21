"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CashFlowPoint } from "@/lib/analytics";
import { CHART_EXPENSE, CHART_INCOME } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <p className="label-caps mb-1">Trend</p>
        <CardTitle className="font-display text-lg font-semibold">
          Cash flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState
            title="No confirmed transactions yet"
            description="Log a few expenses and deposits and the trend will show up here."
            className="border-0 py-8"
          />
        ) : (
          <>
            <div className="h-64 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill={CHART_INCOME} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill={CHART_EXPENSE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Monthly income vs expense</caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Income</th>
                  <th>Expense</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.month}>
                    <td>{d.label}</td>
                    <td>{formatCurrency(d.income)}</td>
                    <td>{formatCurrency(d.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
