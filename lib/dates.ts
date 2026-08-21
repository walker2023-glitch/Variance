/** Date helpers. Transaction dates are stored as `YYYY-MM-DD` (no time zone). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Inclusive day difference: `to - from` in whole days. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Sunday–Saturday week containing `d`, in local time. */
export function weekBounds(d: Date = new Date()): { from: string; to: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: toISODate(start), to: toISODate(end) };
}

/** Calendar month containing `d`, in local time. */
export function monthBounds(d: Date = new Date()): { from: string; to: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toISODate(start), to: toISODate(end) };
}

/** First day of the month `n` months before the month containing `d`. */
export function monthsAgoStart(n: number, d: Date = new Date()): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() - n, 1));
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export function weekdayLabel(n: number | null | undefined): string {
  return WEEKDAYS.find((w) => w.value === n)?.label ?? "—";
}
