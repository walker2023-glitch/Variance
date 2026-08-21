import type { Budget, Transaction } from "@/lib/types/database";
import { monthBounds, weekBounds } from "@/lib/dates";
import { asNumber } from "@/lib/utils";

export type BudgetProgress = Budget & {
  spent: number;
  remaining: number;
  percent: number;
  periodFrom: string;
  periodTo: string;
};

/** Confirmed expenses only (FR-25). */
export function confirmedExpenseTotal(
  transactions: Transaction[],
  opts?: { from?: string; to?: string; category?: string | null },
): number {
  return transactions.reduce((sum, t) => {
    if (t.type !== "expense" || t.status !== "confirmed") return sum;
    if (opts?.from && t.transaction_date < opts.from) return sum;
    if (opts?.to && t.transaction_date > opts.to) return sum;
    if (opts?.category && t.category !== opts.category) return sum;
    return sum + asNumber(t.amount);
  }, 0);
}

export function attachBudgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  today: Date = new Date(),
): BudgetProgress[] {
  const week = weekBounds(today);
  const month = monthBounds(today);

  return budgets
    .filter((b) => b.is_active)
    .map((b) => {
      const period = b.scope === "weekly_total" ? week : month;
      const spent = confirmedExpenseTotal(transactions, {
        from: period.from,
        to: period.to,
        category: b.scope === "category" ? b.category : null,
      });
      const limit = asNumber(b.limit_amount);
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        ...b,
        spent,
        remaining: limit - spent,
        percent,
        periodFrom: period.from,
        periodTo: period.to,
      };
    });
}

/** Visual state for a spend-vs-limit bar (FR-24). */
export function budgetTone(
  percent: number,
): "ok" | "warn" | "over" {
  if (percent >= 100) return "over";
  if (percent >= 80) return "warn";
  return "ok";
}
