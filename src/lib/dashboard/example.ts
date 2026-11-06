// EXAMPLE numbers for the dashboard, used only where no real data exists yet. They are made up by a
// "pretend random" recipe, so the same card, country and period always give the same numbers (the page
// does not jump around). The page always labels them EXAMPLE.
import { DAYS_IN, WINDOW, type Granularity } from "./time.ts";

// A number from a piece of text, the same every time.
function hash(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
// 0 to 1, the same every time for the same text
export const unit = (text: string) => hash(text) / 4294967296;

// A country has a smaller share of the world. Worldwide = 1.
export function countryScale(country: string): number {
  return country === "ALL" ? 1 : 0.08 + unit(`scale|${country}`) * 0.4;
}

// One period's example number: `base` per day, times the days in the period, times the country share,
// with some ups and downs.
export function exampleValue(seed: string, base: number, g: Granularity, country: string, periodKey: string): number {
  const wobble = 0.65 + unit(`${seed}|${country}|${periodKey}`) * 0.7; // 0.65 to 1.35
  return Math.max(0, Math.round(base * DAYS_IN[g] * countryScale(country) * wobble));
}

export const exampleSeries = (seed: string, base: number, g: Granularity, country: string, keys: string[]) =>
  keys.map((k) => exampleValue(seed, base, g, country, k));

// A ranked list or a fixed list (weekdays): `base` is per day over the whole shown window.
export function exampleBreakdown(seed: string, items: string[], base: number, g: Granularity, country: string, ranked: boolean) {
  const days = WINDOW[g] * DAYS_IN[g];
  const rows = items.map((label) => ({
    label,
    value: Math.max(0, Math.round(base * days * countryScale(country) * (0.3 + unit(`${seed}|${country}|${label}`) * 1.4))),
  }));
  return ranked ? rows.sort((a, b) => b.value - a.value) : rows;
}

// ---- made-up names, all labelled EXAMPLE on the page ----
export const EXAMPLE_PLACES = ["Saffron Table", "Date & Bean", "Pearl Pastry", "Sunrise Grill", "Thread & Co", "Oud Corner", "Bloom Lane", "Palm Court Cafe", "Harbour Kitchen", "Dune Bakery"];
export const EXAMPLE_RESTAURANTS = ["Saffron Table", "Date & Bean", "Pearl Pastry", "Sunrise Grill"];
export const EXAMPLE_INFLUENCERS = [
  { id: "example-1", name: "Creator One (example)", handle: "@example_one", reels: 18, visits: 74 },
  { id: "example-2", name: "Creator Two (example)", handle: "@example_two", reels: 9, visits: 21 },
  { id: "example-3", name: "Creator Three (example)", handle: "@example_three", reels: 31, visits: 140 },
];
export const HOLIDAYS = ["Eid al-Fitr", "Eid al-Adha", "UAE National Day", "New Year's Eve", "Ramadan evenings", "Valentine's Day", "Mother's Day", "Christmas Day"];

export function exampleCities(country: string): string[] {
  const byCountry: Record<string, string[]> = {
    AE: ["Abu Dhabi", "Dubai", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah"],
    SA: ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar"],
    EG: ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Hurghada"],
    GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
    US: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  };
  return byCountry[country] ?? (country === "ALL" ? ["Dubai", "Abu Dhabi", "Riyadh", "Cairo", "London", "New York"] : ["Largest city", "Second city", "Third city", "Fourth city", "Fifth city"]);
}
