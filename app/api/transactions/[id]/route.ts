import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { formatZodError, transactionUpdateSchema } from "@/lib/validation";

/** PATCH /api/transactions/:id — Confirm/Edit a transaction. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(formatZodError(parsed.error), 400);
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Not found", 404);
  return NextResponse.json({ data });
}

/** DELETE /api/transactions/:id — Dismiss (delete only this occurrence). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ ok: true });
}
