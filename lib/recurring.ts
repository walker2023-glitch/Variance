/**
 * Recurring-rule due-date logic used by `/api/cron/check-recurring`.
 *
 * Frequencies:
 *  - monthly: fires on `day_of_month` (clamped to the last day of short months).
 *    Catch-up: if the cron missed the exact day, the next run still generates
 *    as long as today is on/after this month's due date and `last_run_date`
 *    is before that due date.
 *  - weekly / biweekly: `day_of_month` is a JS weekday (0=Sun … 6=Sat).
 *    Catch-up: if the matching weekday was missed, generate once the period
 *    (7 or 14 days) since `last_run_date` has elapsed.
 *
 * Idempotency is enforced here (`last_run_date >= today` → skip) AND by a
 * unique index on `(recurring_rule_id, transaction_date)`.
 */

import type { RecurringRule } from "@/lib/types/database";
import { daysBetween, daysInMonth, parseISODate, toISODate } from "@/lib/dates";

export function isRuleDue(rule: RecurringRule, today: Date = new Date()): boolean {
  const todayStr = toISODate(today);
  if (rule.last_run_date && rule.last_run_date >= todayStr) return false;

  if (rule.frequency === "monthly") {
    const dueDay = Math.min(rule.day_of_month ?? 1, daysInMonth(today));
    const thisMonthDue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
    if (todayStr < thisMonthDue) return false;
    if (rule.last_run_date && rule.last_run_date >= thisMonthDue) return false;
    return true;
  }

  const period = rule.frequency === "biweekly" ? 14 : 7;
  const weekday = (rule.day_of_month ?? parseISODate(rule.created_at.slice(0, 10)).getDay()) % 7;
  const matchesWeekday = today.getDay() === weekday;

  if (!rule.last_run_date) {
    // First occurrence: wait for the matching weekday.
    return matchesWeekday;
  }

  if (daysBetween(rule.last_run_date, todayStr) < period) return false;
  // Prefer the matching weekday; catch up if we already missed it.
  return matchesWeekday || daysBetween(rule.last_run_date, todayStr) >= period;
}
