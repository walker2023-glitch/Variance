import { describe, expect, it } from "vitest";

import { transactionCreateSchema } from "@/lib/validation";

describe("transactionCreateSchema", () => {
  it("accepts a valid expense", () => {
    const parsed = transactionCreateSchema.parse({
      amount: 4.5,
      type: "expense",
      category: "Dining Out",
    });
    expect(parsed.amount).toBe(4.5);
  });

  it("rejects a zero or negative amount", () => {
    expect(
      transactionCreateSchema.safeParse({
        amount: 0,
        type: "expense",
        category: "Dining Out",
      }).success,
    ).toBe(false);
    expect(
      transactionCreateSchema.safeParse({
        amount: -1,
        type: "expense",
        category: "Dining Out",
      }).success,
    ).toBe(false);
  });

  it("rejects a category outside the fixed list", () => {
    const parsed = transactionCreateSchema.safeParse({
      amount: 10,
      type: "expense",
      category: "Snacks",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const parsed = transactionCreateSchema.safeParse({
      amount: 10,
      type: "expense",
      category: "Groceries",
      transaction_date: "08/20/2026",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts Unorganized as a category (OCR fallback)", () => {
    const parsed = transactionCreateSchema.parse({
      amount: 10,
      type: "expense",
      category: "Unorganized",
    });
    expect(parsed.category).toBe("Unorganized");
  });
});
