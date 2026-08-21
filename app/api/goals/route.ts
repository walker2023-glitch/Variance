import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { formatZodError, goalSchema } from "@/lib/validation";

/** GET /api/goals — list the caller's financial goals. */
export async function GET() {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data });
}

/** POST /api/goals — create a goal. current_amount is manual in v1. */
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

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: user.id,
      title: input.title,
      target_amount: input.target_amount,
      current_amount: input.current_amount ?? 0,
      target_date: input.target_date ?? null,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}
