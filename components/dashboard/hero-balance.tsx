"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

import type { CashFlowPoint } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type HeroBalanceProps = {
  /** Net for the current month (income − expenses). */
  netThisMonth: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  sparkline: CashFlowPoint[];
};

export function HeroBalance({
  netThisMonth,
  incomeThisMonth,
  expenseThisMonth,
  sparkline,
}: HeroBalanceProps) {
  const trendData = sparkline.map((p) => ({
    label: p.label,
    net: p.income - p.expense,
  }));

  return (
    <Card className="overflow-hidden border-primary/10 bg-card shadow-sm">
      <CardContent className="relative p-6 pb-5 pt-5">
        <div className="absolute inset-x-0 top-0 h-24 opacity-40 dark:opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#heroSpark)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="relative">
          <p className="label-caps">Net this month</p>
          <p className="font-display mt-2 text-4xl font-bold tabular-nums tracking-tight text-primary md:text-5xl">
            {formatCurrency(netThisMonth)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="text-success">{formatCurrency(incomeThisMonth)}</span>
            {" in · "}
            <span>{formatCurrency(expenseThisMonth)}</span>
            {" out"}
          </p>
          <p className="label-caps mt-4 text-muted-foreground/80">
            Starting balance & reconcile — coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
