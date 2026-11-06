// Days, weeks and months for the dashboard. Everything uses UTC dates ("2026-11-05") so a visitor's
// time zone can never move a number into the wrong day.

export type Granularity = "day" | "week" | "month";
export const GRANULARITIES: Granularity[] = ["day", "week", "month"];
export const GRANULARITY_LABEL: Record<Granularity, string> = { day: "Per day", week: "Per week", month: "Per month" };

// How many periods one chart or table shows: 30 days, 12 weeks, 12 months.
export const WINDOW: Record<Granularity, number> = { day: 30, week: 12, month: 12 };
// About how many days one period covers (used to size the example numbers).
export const DAYS_IN: Record<Granularity, number> = { day: 1, week: 7, month: 30 };

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// The first day of the period a day belongs to. Weeks start on Monday.
export function periodStart(iso: string, g: Granularity): string {
  const d = toDate(iso);
  if (g === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (g === "month") d.setUTCDate(1);
  return isoDay(d);
}

export function addPeriods(startIso: string, g: Granularity, n: number): string {
  const d = toDate(startIso);
  if (g === "day") d.setUTCDate(d.getUTCDate() + n);
  if (g === "week") d.setUTCDate(d.getUTCDate() + 7 * n);
  if (g === "month") d.setUTCMonth(d.getUTCMonth() + n);
  return isoDay(d);
}

// The periods to show, oldest first. "past" ends with the period that holds today; "future" starts with it.
export function periodKeys(g: Granularity, todayIso: string, direction: "past" | "future" = "past"): string[] {
  const now = periodStart(todayIso, g);
  const n = WINDOW[g];
  const first = direction === "past" ? addPeriods(now, g, -(n - 1)) : now;
  return Array.from({ length: n }, (_, i) => addPeriods(first, g, i));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function periodLabel(key: string, g: Granularity): string {
  const d = toDate(key);
  if (g === "month") return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return g === "week" ? `Week of ${base}` : base;
}

// Add up daily numbers into periods. Days outside the shown periods are ignored.
export function bucketRows(rows: { day: string; value: number }[], g: Granularity, keys: string[]): number[] {
  const at = new Map(keys.map((k, i) => [k, i]));
  const out = keys.map(() => 0);
  for (const r of rows) {
    const i = at.get(periodStart(r.day.slice(0, 10), g));
    if (i !== undefined) out[i] += Number(r.value);
  }
  return out;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
