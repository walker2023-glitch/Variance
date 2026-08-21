/**
 * Fixed category taxonomy for v1 (plan.md section 8).
 *
 * This is the single source of truth used by:
 *  - the manual quick-entry category picker
 *  - the per-category budget limits
 *  - the /api/ocr Gemini prompt (so OCR guesses stay inside this list)
 *
 * Intentionally NOT enforced at the DB level via a CHECK constraint so the
 * list is a one-line change here when it needs to grow.
 */

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Rent/Mortgage",
  "Utilities",
  "Dining Out",
  "Transportation",
  "Entertainment",
  "Subscriptions",
  "Health/Medical",
  "Shopping",
  "Travel",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Paycheck",
  "Freelance/Side Income",
  "Gift",
  "Refund",
  "Other Income",
] as const;

/**
 * Fallback bucket for receipts the OCR model can't confidently categorize
 * (FR-26). Kept separate so it can be surfaced on the /unorganized view.
 */
export const UNORGANIZED_CATEGORY = "Unorganized" as const;

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
  UNORGANIZED_CATEGORY,
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type Category = (typeof ALL_CATEGORIES)[number];

export type TransactionType = "expense" | "deposit";

/** Categories offered by the picker for a given transaction type. */
export function categoriesForType(type: TransactionType): readonly string[] {
  return type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function isValidCategory(value: string): value is Category {
  return (ALL_CATEGORIES as readonly string[]).includes(value);
}
