/**
 * Demo "today" — the calendar day used by all dashboard / angels / reports
 * filters that bucket rounds, issues, and KPIs into "today / this week /
 * this month."
 *
 * Was previously hardcoded to "2026-05-06" in three pages, which caused
 * today's seeded rounds to be invisible on every other day. We now derive
 * it from the user's local clock so a fresh demo seed always lights up
 * today's KPIs.
 *
 * Returned as a YYYY-MM-DD string so callers can keep using
 * `r.completedAt.startsWith(todayIsoDate())` style checks.
 */
export function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** End-of-day Date for today (23:59:59 local). */
export function todayEndOfDay(): Date {
  return new Date(`${todayIsoDate()}T23:59:59`);
}

/** Start-of-day Date for today (00:00:00 local). */
export function todayStartOfDay(): Date {
  return new Date(`${todayIsoDate()}T00:00:00`);
}

/** Human-formatted date for the topbar, e.g. "Tue May 6, 2026". */
export function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a `YYYY-MM-DD` (or full ISO datetime) without the off-by-one
 * shift that `new Date("2026-05-07").toLocaleDateString()` causes when
 * the host timezone has a negative UTC offset. Bare date strings are
 * parsed as local midnight; full ISO datetimes are honored as-is.
 */
export function formatDate(s: string): string {
  if (!s) return '';
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(s);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
