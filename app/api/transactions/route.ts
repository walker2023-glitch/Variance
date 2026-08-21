import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { formatZodError, transactionCreateSchema } from "@/lib/validation";

/**
 * GET /api/transactions
 * Query params: from, to (YYYY-MM-DD), category, status, type, limit, offset.
 * Returns the caller's transactions (RLS-scoped), newest first.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const category = sp.get("category");
  const status = sp.get("status");
  const type = sp.get("type");
  const limit = Math.min(Number(sp.get("limit") ?? 100), 500);
  const offset = Number(sp.get("offset") ?? 0);

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lte("transaction_date", to);
  if (category) query = query.eq("category", category);
  if (status)
    query = query.eq("status", status as "confirmed" | "pending_confirmation");
  if (type) query = query.eq("type", type as "expense" | "deposit");

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message, 500);

  return NextResponse.json({ data, count });
}

/**
 * POST /api/transactions
 * Creates a transaction. Defaults source=manual, status=confirmed, date=today.
 */
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

  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      amount: input.amount,
      type: input.type,
      category: input.category,
      merchant: input.merchant ?? null,
      transaction_date: input.transaction_date, // undefined -> DB default CURRENT_DATE
      source: input.source ?? "manual",
      status: input.status ?? "confirmed",
      receipt_url: input.receipt_url ?? null,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}
