import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isRuleDue } from "@/lib/recurring";
import { toISODate } from "@/lib/dates";
import type { RecurringRule } from "@/lib/types/database";

/**
 * POST /api/cron/check-recurring  (also GET — Vercel Cron sends GET)
 *
 * No user session. Authenticated via `x-cron-secret` or
 * `Authorization: Bearer <CRON_SECRET>` (Vercel's default).
 *
 * Scans active rules, creates one transaction per due rule, updates
 * last_run_date. Safe to re-run: last_run_date check + unique index
 * on (recurring_rule_id, transaction_date).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  if (header && header === secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return false;
}

async function runCron(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayStr = toISODate(today);

  const { data: rules, error: rulesError } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("is_active", true);

  if (rulesError) {
    console.error("[cron] failed to load rules:", rulesError.message);
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  const scanned = rules?.length ?? 0;
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const rule of (rules ?? []) as RecurringRule[]) {
    if (!isRuleDue(rule, today)) {
      skipped += 1;
      continue;
    }

    const status = rule.auto_confirm ? "confirmed" : "pending_confirmation";

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: rule.user_id,
      amount: Number(rule.amount),
      type: rule.type,
      category: rule.category,
      merchant: rule.merchant,
      transaction_date: todayStr,
      source: "recurring",
      status,
      recurring_rule_id: rule.id,
    });

    if (insertError) {
      // Unique-index collision = already generated for this due date (AC-5).
      if (insertError.code === "23505") {
        skipped += 1;
      } else {
        errors.push(`${rule.id}: ${insertError.message}`);
        console.error("[cron] insert failed", rule.id, insertError.message);
        continue;
      }
    } else {
      created += 1;
    }

    const { error: updateError } = await supabase
      .from("recurring_rules")
      .update({ last_run_date: todayStr })
      .eq("id", rule.id);

    if (updateError) {
      errors.push(`${rule.id} last_run_date: ${updateError.message}`);
    }
  }

  console.info(
    `[cron] scanned=${scanned} created=${created} skipped=${skipped} errors=${errors.length}`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    scanned,
    created,
    skipped,
    errors,
  });
}
