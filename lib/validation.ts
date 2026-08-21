import { z } from "zod";

import { ALL_CATEGORIES } from "@/lib/categories";

const categoryEnum = z.enum(
  ALL_CATEGORIES as unknown as [string, ...string[]],
);

/** Amount must be a positive number with up to 2 decimal places. */
const amount = z
  .number()
  .positive("Amount must be greater than 0")
  .max(99_999_999, "Amount is too large")
  .refine((n) => Number.isFinite(n), "Amount must be a number");

export const transactionCreateSchema = z.object({
  amount,
  type: z.enum(["expense", "deposit"]),
  category: categoryEnum,
  merchant: z.string().trim().max(100).optional().nullable(),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  source: z.enum(["manual", "ocr", "recurring"]).optional(),
  status: z.enum(["confirmed", "pending_confirmation"]).optional(),
  receipt_url: z.string().optional().nullable(),
});

export const transactionUpdateSchema = z.object({
  amount: amount.optional(),
  type: z.enum(["expense", "deposit"]).optional(),
  category: categoryEnum.optional(),
  merchant: z.string().trim().max(100).optional().nullable(),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(["confirmed", "pending_confirmation"]).optional(),
});

const recurringRuleBase = z.object({
  amount,
  type: z.enum(["expense", "deposit"]),
  category: categoryEnum,
  merchant: z.string().trim().max(100).optional().nullable(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  // monthly: 1–31 (day of month). weekly/biweekly: 0–6 (JS weekday, 0=Sun).
  day_of_month: z.number().int().min(0).max(31).optional().nullable(),
  auto_confirm: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const recurringRuleSchema = recurringRuleBase.refine(
  (r) => {
    if (r.frequency === "monthly") {
      return r.day_of_month != null && r.day_of_month >= 1 && r.day_of_month <= 31;
    }
    return r.day_of_month != null && r.day_of_month >= 0 && r.day_of_month <= 6;
  },
  {
    message:
      "Monthly rules need a day of month (1–31); weekly/biweekly rules need a weekday (0–6)",
    path: ["day_of_month"],
  },
);

export const recurringRuleUpdateSchema = recurringRuleBase.partial();

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  target_amount: amount,
  current_amount: z.number().min(0).optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export const goalUpdateSchema = goalSchema.partial();

export const budgetSchema = z
  .object({
    scope: z.enum(["weekly_total", "category"]),
    category: categoryEnum.optional().nullable(),
    limit_amount: amount,
    is_active: z.boolean().optional(),
  })
  .refine((b) => b.scope === "weekly_total" || !!b.category, {
    message: "A category is required for per-category limits",
    path: ["category"],
  });

export const budgetUpdateSchema = z.object({
  limit_amount: amount.optional(),
  is_active: z.boolean().optional(),
});

/** Flatten a ZodError into a single human-readable string. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}
