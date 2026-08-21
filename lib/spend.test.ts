import { describe, expect, it } from "vitest";

import { attachBudgetProgress, budgetTone, confirmedExpenseTotal } from "@/lib/spend";
import type { Budget, Transaction } from "@/lib/types/database";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    user_id: "u1",
    amount: 10,
    type: "expense",
    category: "Groceries",
    merchant: null,
    transaction_date: "2026-08-20",
    source: "manual",
    status: "confirmed",
    receipt_url: null,
    recurring_rule_id: null,
    created_at: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("budgetTone", () => {
  it("is ok below 80%, warn at 80, over at 100+", () => {
    expect(budgetTone(79.9)).toBe("ok");
    expect(budgetTone(80)).toBe("warn");
    expect(budgetTone(100)).toBe("over");
    expect(budgetTone(150)).toBe("over");
  });
});

describe("confirmedExpenseTotal", () => {
  it("counts confirmed expenses only (FR-25)", () => {
    const rows = [
      tx({ id: "1", amount: 10 }),
      tx({ id: "2", amount: 5, status: "pending_confirmation" }),
      tx({ id: "3", amount: 20, type: "deposit", category: "Paycheck" }),
    ];
    expect(confirmedExpenseTotal(rows)).toBe(10);
  });
});

describe("attachBudgetProgress", () => {
  it("computes weekly-total spend inside the current week", () => {
    const today = new Date(2026, 7, 20); // Thursday
    const budgets: Budget[] = [
      {
        id: "b1",
        user_id: "u1",
        scope: "weekly_total",
        category: null,
        limit_amount: 100,
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const txs = [
      tx({ id: "in", amount: 40, transaction_date: "2026-08-18" }),
      tx({ id: "out", amount: 99, transaction_date: "2026-08-09" }),
    ];
    const [row] = attachBudgetProgress(budgets, txs, today);
    expect(row.spent).toBe(40);
    expect(row.percent).toBe(40);
    expect(budgetTone(row.percent)).toBe("ok");
  });
});
