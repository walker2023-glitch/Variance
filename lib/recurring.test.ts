import { describe, expect, it } from "vitest";

import type { RecurringRule } from "@/lib/types/database";
import { isRuleDue } from "@/lib/recurring";

function rule(overrides: Partial<RecurringRule>): RecurringRule {
  return {
    id: "rule-1",
    user_id: "user-1",
    amount: 1200,
    type: "expense",
    category: "Rent/Mortgage",
    merchant: "Landlord",
    frequency: "monthly",
    day_of_month: 1,
    auto_confirm: false,
    is_active: true,
    last_run_date: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isRuleDue", () => {
  it("is due on the matching day of month when never run", () => {
    const r = rule({ day_of_month: 15 });
    expect(isRuleDue(r, new Date(2026, 7, 15))).toBe(true);
    expect(isRuleDue(r, new Date(2026, 7, 14))).toBe(false);
  });

  it("catches up after a missed monthly due date in the same month", () => {
    const r = rule({ day_of_month: 10, last_run_date: "2026-07-10" });
    expect(isRuleDue(r, new Date(2026, 7, 12))).toBe(true);
  });

  it("does not generate twice in the same month after last_run_date", () => {
    const r = rule({ day_of_month: 10, last_run_date: "2026-08-10" });
    expect(isRuleDue(r, new Date(2026, 7, 20))).toBe(false);
  });

  it("is not due again on the same calendar day (idempotent)", () => {
    const r = rule({ last_run_date: "2026-08-01" });
    expect(isRuleDue(r, new Date(2026, 7, 1))).toBe(false);
  });

  it("clamps monthly day_of_month to the last day of short months", () => {
    const r = rule({ day_of_month: 31 });
    expect(isRuleDue(r, new Date(2026, 1, 28))).toBe(true); // Feb 2026
    expect(isRuleDue(r, new Date(2026, 1, 27))).toBe(false);
  });

  it("weekly: first run waits for the matching weekday", () => {
    // day_of_month 1 = Monday
    const r = rule({ frequency: "weekly", day_of_month: 1, last_run_date: null });
    expect(isRuleDue(r, new Date(2026, 7, 17))).toBe(true); // Mon
    expect(isRuleDue(r, new Date(2026, 7, 18))).toBe(false); // Tue
  });

  it("weekly: not due until 7 days after last_run_date", () => {
    const r = rule({
      frequency: "weekly",
      day_of_month: 1,
      last_run_date: "2026-08-17",
    });
    expect(isRuleDue(r, new Date(2026, 7, 20))).toBe(false);
    expect(isRuleDue(r, new Date(2026, 7, 24))).toBe(true);
  });

  it("biweekly requires 14 days since last_run_date", () => {
    const r = rule({
      frequency: "biweekly",
      day_of_month: 1,
      last_run_date: "2026-08-10",
    });
    expect(isRuleDue(r, new Date(2026, 7, 17))).toBe(false);
    expect(isRuleDue(r, new Date(2026, 7, 24))).toBe(true);
  });
});
