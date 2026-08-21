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
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cash flow (trailing 6 months)</CardTitle>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
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
