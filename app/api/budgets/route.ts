import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { formatZodError, budgetSchema } from "@/lib/validation";
import { attachBudgetProgress } from "@/lib/spend";
import { monthBounds, weekBounds } from "@/lib/dates";
import type { Budget, Transaction } from "@/lib/types/database";

/**
 * GET /api/budgets
 * Returns active + inactive limits. Each row includes spent/remaining/percent
 * computed from confirmed expenses (FR-25): weekly_total uses the current
 * Sunday–Saturday week; category uses the current calendar month.
 */
export async function GET() {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("*")
    .order("scope")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const week = weekBounds();
  const month = monthBounds();
  const from = week.from < month.from ? week.from : month.from;
  const to = week.to > month.to ? week.to : month.to;

  const { data: txs } = await supabase
    .from("transactions")
    .select("*")
    .eq("status", "confirmed")
    .eq("type", "expense")
    .gte("transaction_date", from)
    .lte("transaction_date", to);

  const data = attachBudgetProgress(
    (budgets ?? []) as Budget[],
    (txs ?? []) as Transaction[],
  );

  return NextResponse.json({ data, all: budgets });
}

/** POST /api/budgets — create a weekly-total or per-category limit. */
export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      scope: input.scope,
      category: input.scope === "category" ? (input.category ?? null) : null,
      limit_amount: input.limit_amount,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}
