// The live counters: guess the visitor's country, and pick which counters are big enough to show.
import { COUNTRY_CODES } from "./countries.ts";

export type StatRow = { metric: string; country: string; value: number | string };
export type Shown = { metric: string; country?: number; world?: number };

// Cloudflare answers /cdn-cgi/trace with lines like "loc=AE". "XX" and "T1" mean "unknown" or Tor.
export function parseTraceCountry(trace: string): string | null {
  const m = trace.match(/^loc=([A-Z]{2})\s*$/m);
  if (!m || m[1] === "XX" || m[1] === "T1") return null;
  return COUNTRY_CODES.includes(m[1]) ? m[1] : null;
}

// A backup guess from the browser's language, for example "en-AE" gives "AE".
export function countryFromLanguage(language: string | undefined): string | null {
  const m = (language ?? "").match(/[-_]([A-Za-z]{2})\b/);
  const code = m ? m[1].toUpperCase() : "";
  return COUNTRY_CODES.includes(code) ? code : null;
}

// A counter shows only once its number is AT LEAST its minimum, for the country and for the world separately.
export function pickCounters(
  rows: StatRow[],
  country: string | null,
  minimums: Record<string, number>,
  order: string[],
): Shown[] {
  const value = (metric: string, c: string) => Number(rows.find((r) => r.metric === metric && r.country === c)?.value ?? 0);
  const shown: Shown[] = [];
  for (const metric of order) {
    const min = minimums[metric] ?? Infinity;
    const world = value(metric, "ALL");
    const local = country ? value(metric, country) : 0;
    const item: Shown = { metric };
    if (world >= min) item.world = world;
    if (country && local >= min) item.country = local;
    if (item.world !== undefined || item.country !== undefined) shown.push(item);
  }
  return shown;
}
