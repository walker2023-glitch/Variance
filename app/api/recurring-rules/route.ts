import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { formatZodError, recurringRuleSchema } from "@/lib/validation";

/** GET /api/recurring-rules — list the caller's rules, active first. */
export async function GET() {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data });
}

/** POST /api/recurring-rules — create a rule. */
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

  const parsed = recurringRuleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: user.id,
      amount: input.amount,
      type: input.type,
      category: input.category,
      merchant: input.merchant ?? null,
      frequency: input.frequency,
      day_of_month: input.day_of_month ?? null,
      auto_confirm: input.auto_confirm ?? false,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}
