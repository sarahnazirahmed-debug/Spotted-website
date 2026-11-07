// "12 days ago", "2 months 10 days ago", "1 year 2 months ago": at most two units, using calendar days, months and years.
const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// from and to are days written YYYY-MM-DD (a longer date-time is cut to its day).
export function timeAgo(from: string, to: string = new Date().toISOString().slice(0, 10)): string {
  const a = from.slice(0, 10).split("-").map(Number);
  const b = to.slice(0, 10).split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return "";
  const [y1, m1, d1] = a as [number, number, number];
  const [y2, m2, d2] = b as [number, number, number];
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  if (months < 0) return ""; // a day in the future
  // the day this many whole months after the start (a short month is cut to its last day), then count the days left
  const lastDay = new Date(Date.UTC(y1, m1 - 1 + months + 1, 0)).getUTCDate();
  const anchor = Date.UTC(y1, m1 - 1 + months, Math.min(d1, lastDay));
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - anchor) / 86400000);
  const years = Math.floor(months / 12);
  months %= 12;
  if (years > 0) return `${unit(years, "year")}${months > 0 ? ` ${unit(months, "month")}` : ""} ago`;
  if (months > 0) return `${unit(months, "month")}${days > 0 ? ` ${unit(days, "day")}` : ""} ago`;
  return days === 0 ? "today" : `${unit(days, "day")} ago`;
}

export const SEEN_IN_A_REEL = "Seen in a reel. Prices may vary.";

// "7 Nov 2026"
export const niceDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
