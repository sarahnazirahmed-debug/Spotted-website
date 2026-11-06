// Puts the cards into plain tables, for the Excel and PDF downloads. The same tables are used by both.
import { seriesTotal, type CardData } from "./compute.ts";

export type Table = { title: string; note: string; header: string[]; rows: (string | number)[][] };

const sourceNote = (d: CardData) => (d.source === "real" ? "Real data" : "EXAMPLE data (no real data exists for this yet)");

export function cardToTable(d: CardData, influencerRows?: (string | number)[][]): Table | null {
  const title = d.card.title;
  if (d.kind === "series") {
    const many = d.series.length > 1;
    return {
      title,
      note: sourceNote(d),
      header: ["Period", ...d.series.map((s) => (s.aed ? `${s.label} (AED)` : s.label)), ...(many ? ["Total"] : [])],
      rows: d.labels.map((label, i) => {
        const vals = d.series.map((s) => s.values[i]);
        return [label, ...vals, ...(many ? [vals.reduce((a, b) => a + b, 0)] : [])];
      }),
    };
  }
  if (d.kind === "breakdown") {
    return { title, note: sourceNote(d), header: ["Item", d.aed ? "AED" : "Number"], rows: d.rows.map((r) => [r.label, r.value]) };
  }
  if (influencerRows) {
    return { title, note: sourceNote(d), header: ["Insider", "Handle", "Reels linked", "Visits", "Visits per reel"], rows: influencerRows };
  }
  return null;
}

// Excel sheet names: at most 31 letters, none of  [ ] : * ? / \  , and each one different.
export function sheetNames(titles: string[]): string[] {
  const used = new Set<string>();
  return titles.map((t) => {
    const base = t.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 28) || "Sheet";
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 28 - String(n).length - 1)} ${n}`;
    used.add(name.toLowerCase());
    return name;
  });
}

export type ExportMeta = { generated: string; country: string; granularity: string; who: string };

export function summaryRows(meta: ExportMeta, tables: Table[]): (string | number)[][] {
  return [
    ["Spotted dashboard"],
    ["Generated", meta.generated],
    ["Country", meta.country],
    ["Shown", meta.granularity],
    ["Prepared for", meta.who],
    [],
    ["Card", "Data"],
    ...tables.map((t) => [t.title, t.note]),
  ];
}

export { seriesTotal };
