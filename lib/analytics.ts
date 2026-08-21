import type { Transaction } from "@/lib/types/database";
import { monthsAgoStart, toISODate } from "@/lib/dates";
import { asNumber } from "@/lib/utils";

export type CashFlowPoint = {
  month: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
};

export type CategorySlice = {
  category: string;
  amount: number;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Trailing `n` calendar months of confirmed income vs expense. */
export function cashFlowByMonth(
  transactions: Transaction[],
  months = 6,
  today: Date = new Date(),
): CashFlowPoint[] {
  const start = monthsAgoStart(months - 1, today);
  const buckets = new Map<string, CashFlowPoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: key,
      label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      income: 0,
      expense: 0,
    });
  }

  for (const t of transactions) {
    if (t.status !== "confirmed") continue;
    if (t.transaction_date < start) continue;
    const key = t.transaction_date.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const amt = asNumber(t.amount);
    if (t.type === "deposit") bucket.income += amt;
    else bucket.expense += amt;
  }

  return Array.from(buckets.values());
}

export function categoryBreakdown(
  transactions: Transaction[],
  from: string,
  to: string,
): CategorySlice[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.status !== "confirmed" || t.type !== "expense") continue;
    if (t.transaction_date < from || t.transaction_date > to) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + asNumber(t.amount));
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type RangeKey = "month" | "3m" | "6m" | "ytd";

export function rangeBounds(
  key: RangeKey,
  today: Date = new Date(),
): { from: string; to: string } {
  const to = toISODate(today);
  if (key === "month") {
    return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  }
  if (key === "3m") {
    return { from: toISODate(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to };
  }
  if (key === "6m") {
    return { from: toISODate(new Date(today.getFullYear(), today.getMonth() - 5, 1)), to };
  }
  return { from: toISODate(new Date(today.getFullYear(), 0, 1)), to };
}
