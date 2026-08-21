import { describe, expect, it } from "vitest";

import { sanitizeOcrResponse } from "@/lib/ocr";
import { UNORGANIZED_CATEGORY } from "@/lib/categories";

describe("sanitizeOcrResponse", () => {
  it("accepts a well-formed JSON object", () => {
    const result = sanitizeOcrResponse(
      JSON.stringify({
        merchant: "Trader Joe's",
        amount: 23.45,
        date: "2026-08-20",
        category: "Groceries",
        items: ["bananas"],
        confident: true,
      }),
    );
    expect(result).toEqual({
      merchant: "Trader Joe's",
      amount: 23.45,
      date: "2026-08-20",
      category: "Groceries",
      items: ["bananas"],
      needsReview: false,
    });
  });

  it("strips markdown fences around JSON", () => {
    const result = sanitizeOcrResponse(
      '```json\n{"merchant":"X","amount":10,"date":"2026-01-01","category":"Dining Out","items":[],"confident":true}\n```',
    );
    expect(result.amount).toBe(10);
    expect(result.merchant).toBe("X");
    expect(result.needsReview).toBe(false);
  });

  it("rejects a non-numeric amount and flags needsReview", () => {
    const result = sanitizeOcrResponse(
      JSON.stringify({
        merchant: "X",
        amount: "twelve dollars",
        date: "2026-01-01",
        category: "Dining Out",
        items: [],
        confident: true,
      }),
    );
    expect(result.amount).toBeNull();
    expect(result.needsReview).toBe(true);
  });

  it("falls back to Unorganized for an unknown category", () => {
    const result = sanitizeOcrResponse(
      JSON.stringify({
        merchant: "X",
        amount: 5,
        date: "2026-01-01",
        category: "Snacks",
        items: [],
        confident: true,
      }),
    );
    expect(result.category).toBe(UNORGANIZED_CATEGORY);
    expect(result.needsReview).toBe(true);
  });

  it("flags needsReview when the model is not confident", () => {
    const result = sanitizeOcrResponse(
      JSON.stringify({
        merchant: "X",
        amount: 5,
        date: "2026-01-01",
        category: "Groceries",
        items: [],
        confident: false,
      }),
    );
    expect(result.needsReview).toBe(true);
    expect(result.category).toBe("Groceries");
  });

  it("returns a safe empty result for malformed JSON", () => {
    const result = sanitizeOcrResponse("not json at all");
    expect(result).toEqual({
      merchant: null,
      amount: null,
      date: null,
      category: UNORGANIZED_CATEGORY,
      items: [],
      needsReview: true,
    });
  });

  it("parses a numeric amount sent as a currency string", () => {
    const result = sanitizeOcrResponse(
      JSON.stringify({
        merchant: "X",
        amount: "$12.50",
        date: "2026-01-01",
        category: "Dining Out",
        items: [],
        confident: true,
      }),
    );
    expect(result.amount).toBe(12.5);
  });
});
