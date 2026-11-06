// Pin Desk <-> Excel. These two functions turn reels into rows and rows back into reels.
// (Reading and writing the .xlsx file itself happens in PinDesk.tsx.)
//
// The columns are the ones in the reels table. If your old Pin Desk page used other column names,
// the importer also understands common alternatives (see ALIASES).
import { MAX_DISHES } from "./dishes.ts";
import { pinProblem } from "./pinRules.ts";
import { readReelLink } from "./reelLinks.ts";
import type { Reel, ReelInput } from "./reelTypes";

// norm() removes spaces and punctuation, so "To check", "to_check" and "TO-CHECK" all become "tocheck".
const STATUS_WORD: Record<string, "to_check" | "pinned" | "skip"> = { tocheck: "to_check", pinned: "pinned", skip: "skip" };

export const HEADERS = [
  "Link", "Platform", "Place name", "Branch", "Emirate", "Country", "Category", "Collection", "Google Maps link",
  "Latitude", "Longitude", "Creator",
  ...Array.from({ length: MAX_DISHES }, (_, i) => [`Dish ${i + 1}`, `Price ${i + 1} (AED)`]).flat(),
  "Offer", "Offer start", "Offer end", "Offer hours", "Notes", "Status", "Added by", "Pinned by",
];

const norm = (h: unknown) => String(h ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<string, string[]> = {
  Link: ["link", "url", "reellink", "reelurl"],
  "Place name": ["placename", "place", "name"],
  Branch: ["branch", "area"],
  Emirate: ["emirate", "city"],
  Country: ["country"],
  Category: ["category", "type"],
  Collection: ["collection", "list"],
  "Google Maps link": ["googlemapslink", "mapslink", "mapsurl", "map", "googlemaps"],
  Latitude: ["latitude", "lat"],
  Longitude: ["longitude", "lng", "lon", "long"],
  Creator: ["creator", "creatorhandle", "handle"],
  Offer: ["offer", "offertext"],
  "Offer start": ["offerstart", "start"],
  "Offer end": ["offerend", "end"],
  "Offer hours": ["offerhours", "hours"],
  Notes: ["notes", "note"],
  Status: ["status"],
};

const dateText = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const text = (v: unknown): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
};
const numberOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function reelsToRows(reels: Reel[]): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [HEADERS];
  for (const r of reels) {
    const dishCells = Array.from({ length: MAX_DISHES }, (_, i) => [r.dishes[i]?.name ?? null, r.dishes[i]?.price_aed ?? null]).flat();
    rows.push([
      r.url, r.platform, r.place_name, r.branch, r.emirate, r.country, r.category, r.collection, r.maps_url,
      r.lat, r.lng, r.creator_handle, ...dishCells,
      r.offer_text, r.offer_start, r.offer_end, r.offer_hours, r.notes,
      r.status === "to_check" ? "To check" : r.status === "pinned" ? "Pinned" : "Skip", r.added_by, r.pinned_by,
    ]);
  }
  return rows;
}

export type ImportResult = { items: ReelInput[]; problems: string[] };

// rows[0] is the header row. Rows that repeat a link inside the file are dropped here;
// links that are already on the desk are dropped by the caller.
export function rowsToReels(rows: unknown[][]): ImportResult {
  const items: ReelInput[] = [];
  const problems: string[] = [];
  if (rows.length < 2) return { items, problems: ["The file has no rows."] };
  const header = rows[0].map(norm);
  const col = (name: string): number => {
    const wanted = [norm(name), ...(ALIASES[name] ?? [])];
    return header.findIndex((h) => wanted.includes(h));
  };
  const at = (row: unknown[], name: string) => {
    const i = col(name);
    return i < 0 ? undefined : row[i];
  };
  if (col("Link") < 0) return { items, problems: ['The file needs a "Link" column.'] };
  const dishCol = (n: number, kind: "name" | "price") => {
    const wanted = kind === "name" ? [`dish${n}`, `dish${n}name`] : [`price${n}`, `price${n}aed`, `dish${n}price`, `dish${n}priceaed`];
    return header.findIndex((h) => wanted.includes(h));
  };
  const seen = new Set<string>();
  rows.slice(1).forEach((row, idx) => {
    const line = idx + 2;
    if (row.every((c) => c == null || c === "")) return;
    const info = readReelLink(String(at(row, "Link") ?? ""));
    if (!info.ok) return void problems.push(`Row ${line}: ${info.reason}`);
    if (seen.has(info.linkKey)) return void problems.push(`Row ${line}: ${info.linkKey} is in the file twice (skipped).`);
    seen.add(info.linkKey);

    const dishes = [];
    for (let n = 1; n <= MAX_DISHES; n++) {
      const name = text(row[dishCol(n, "name")]);
      const price = numberOrNull(row[dishCol(n, "price")]);
      if (name && price != null && price >= 0) dishes.push({ name, price_aed: price });
      else if (name || price != null) problems.push(`Row ${line}: dish ${n} needs a name and a price (skipped).`);
    }
    const statusWord = STATUS_WORD[norm(at(row, "Status"))] ?? "to_check";
    const catRaw = text(at(row, "Category"));
    const category = catRaw ? (["Eat", "Shop", "Play"].find((c) => c.toLowerCase() === catRaw.toLowerCase()) as "Eat" | "Shop" | "Play" | undefined) ?? null : null;
    if (catRaw && !category) problems.push(`Row ${line}: category "${catRaw}" is not Eat, Shop or Play (left empty).`);
    const item: ReelInput = {
      url: info.url,
      link_key: info.linkKey,
      platform: info.platform,
      place_name: text(at(row, "Place name")),
      branch: text(at(row, "Branch")),
      emirate: text(at(row, "Emirate")),
      country: text(at(row, "Country")) ?? "UAE",
      category,
      collection: text(at(row, "Collection")),
      maps_url: text(at(row, "Google Maps link")),
      lat: numberOrNull(at(row, "Latitude")),
      lng: numberOrNull(at(row, "Longitude")),
      creator_handle: text(at(row, "Creator")) ?? info.creator ?? null,
      dishes: dishes.slice(0, MAX_DISHES),
      offer_text: text(at(row, "Offer")),
      offer_start: dateText(at(row, "Offer start")),
      offer_end: dateText(at(row, "Offer end")),
      offer_hours: text(at(row, "Offer hours")),
      notes: text(at(row, "Notes")),
      status: statusWord,
    };
    if (item.maps_url && !/^https:\/\//i.test(item.maps_url)) item.maps_url = null;
    if (item.status === "pinned") {
      const why = pinProblem(item);
      if (why) {
        item.status = "to_check";
        problems.push(`Row ${line}: could not be Pinned (${why.toLowerCase()}) so it is "To check".`);
      }
    }
    if (item.offer_start && item.offer_end && item.offer_end < item.offer_start) {
      item.offer_start = null;
      item.offer_end = null;
      problems.push(`Row ${line}: the offer end is before the start, so the offer dates were left empty.`);
    }
    items.push(item);
  });
  return { items, problems };
}
