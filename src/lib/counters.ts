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

// (Older, kept for when more countries open: a counter per country and for the world, each at its own minimum.)
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

// THE COUNTER BAR (UAE only). Hidden until every one of the `required` numbers is ABOVE its minimum.
// Then the required tiles show, and each of the `later` tiles (partners, insiders) joins once it is above its own minimum.
export type Tile = { metric: string; value: number };
export function pickBar(
  rows: StatRow[],
  country: string,
  minimums: Record<string, number>,
  required: string[],
  later: string[],
): Tile[] {
  const value = (metric: string) => Number(rows.find((r) => r.metric === metric && r.country === country)?.value ?? 0);
  const above = (metric: string) => value(metric) > (minimums[metric] ?? Infinity);
  if (!required.every(above)) return [];
  return [...required, ...later.filter(above)].map((metric) => ({ metric, value: value(metric) }));
}
