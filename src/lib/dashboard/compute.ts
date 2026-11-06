// Turns a card into the numbers the page draws: real numbers where they exist, EXAMPLE numbers where not.
import { cityList } from "./cities.ts";
import type { CardDef } from "./cards.ts";
import { exampleBreakdown, exampleSeries, unit } from "./example.ts";
import { WINDOW, DAYS_IN, bucketRows, periodKeys, periodLabel, type Granularity } from "./time.ts";

export type RealRow = { metric: string; day: string; value: number | string };

export type SeriesData = { id: string; label: string; values: number[]; aed: boolean };
export type CardData =
  | { card: CardDef; source: "real" | "example"; kind: "series"; keys: string[]; labels: string[]; series: SeriesData[] }
  | { card: CardDef; source: "real" | "example"; kind: "breakdown"; rows: { label: string; value: number }[]; aed: boolean }
  | { card: CardDef; source: "real" | "example"; kind: "influencer" };

export type Context = {
  country: string; // "ALL" or a code like AE
  granularity: Granularity;
  today: string; // 2026-11-05
  real: RealRow[] | null; // null = the real numbers could not be loaded
  restaurant: string; // for the restaurant cards
};

export function computeCard(card: CardDef, ctx: Context): CardData {
  const { country, granularity: g } = ctx;
  if (card.kind === "influencer") return { card, source: "real", kind: "influencer" };

  if (card.kind === "breakdown") {
    const seed = `${card.id}|${card.group === "restaurants" ? ctx.restaurant : ""}`;
    const items = card.items === "cities" ? cityList(country) : card.items;
    let rows = exampleBreakdown(seed, items, card.base, g, country, card.ranked);
    if (card.keep) rows = rows.slice(0, card.keep);
    return { card, source: "example", kind: "breakdown", rows, aed: !!card.aed };
  }

  const keys = periodKeys(g, ctx.today, card.direction ?? "past");
  const labels = keys.map((k) => periodLabel(k, g));
  const isReal = card.source === "real" && ctx.real !== null;
  const seedBase = `${card.id}|${card.group === "restaurants" ? ctx.restaurant : ""}`;

  let series: SeriesData[];
  if (isReal) {
    series = card.series.map((s) => ({
      id: s.id,
      label: s.label,
      aed: !!s.aed,
      values: bucketRows(
        ctx.real!.filter((r) => r.metric === s.metric).map((r) => ({ day: r.day, value: Number(r.value) })),
        g,
        keys,
      ),
    }));
  } else if (card.derived === "retention") {
    const cohort = exampleSeries(`${seedBase}|cohort`, card.series[0].base, g, country, keys);
    series = [
      { id: "cohort", label: card.series[0].label, aed: false, values: cohort },
      { id: "back7", label: card.series[1].label, aed: false, values: cohort.map((n, i) => Math.round(n * (0.3 + unit(`b7|${country}|${keys[i]}`) * 0.15))) },
      { id: "back30", label: card.series[2].label, aed: false, values: cohort.map((n, i) => Math.round(n * (0.15 + unit(`b30|${country}|${keys[i]}`) * 0.13))) },
    ];
  } else {
    series = card.series.map((s) => ({
      id: s.id,
      label: s.label,
      aed: !!s.aed,
      values: exampleSeries(`${seedBase}|${s.id}`, s.base, g, country, keys),
    }));
  }
  return { card, source: isReal ? "real" : "example", kind: "series", keys, labels, series };
}

export const seriesTotal = (s: SeriesData) => s.values.reduce((a, b) => a + b, 0);
export const windowDescription = (g: Granularity) => `last ${WINDOW[g] * DAYS_IN[g] === 30 ? "30 days" : g === "week" ? "12 weeks" : "12 months"}`;
