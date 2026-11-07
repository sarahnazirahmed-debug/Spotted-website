// Rules for the "Add restaurant or shop" form. Plain functions, so they can be tested.
// The database checks the same things again (supabase/pindesk.sql); this is for friendly messages.

export type BusinessType = "restaurant" | "shop";

// RESTAURANT = anything food or drink. SHOP = not food.
export const RESTAURANT_KINDS = ["Restaurant", "Cafe", "Cafeteria", "Bakery", "Sweets", "Cloud kitchen", "Home kitchen"];
export const SHOP_KINDS = [
  "Perfume",
  "Clothing",
  "Shoes and bags",
  "Jewellery and watches",
  "Beauty and cosmetics",
  "Home and decor",
  "Gifts and flowers",
  "Electronics",
];
export const OTHER_KIND = "Other";

// The rule: anything food or drink (restaurant, cafe, cafeteria, bakery, sweets, cloud or home kitchen) is a Restaurant.
// Everything else is a Shop.
export const typeOfKind = (kind: string): BusinessType => (RESTAURANT_KINDS.includes(kind) ? "restaurant" : "shop");

export const KINDS: Record<BusinessType, string[]> = { restaurant: RESTAURANT_KINDS, shop: [...SHOP_KINDS, OTHER_KIND] };

// "@Some.Place", "instagram.com/some.place/" and "https://www.instagram.com/some.place?igsh=x" all become "some.place"
export function cleanHandle(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^(www\.)?instagram\.com\//i, "");
  s = s.split(/[/?#]/)[0] ?? "";
  return s.replace(/^@+/, "").toLowerCase();
}

export const handleOk = (h: string) => /^[a-z0-9._]{1,30}$/.test(h);
export const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
export const whatsappOk = (w: string) => /^\+?[0-9 ()-]{7,20}$/.test(w);

// The first thing wrong with the form, in plain words, or null when it is fine.
export function businessProblem(v: {
  name: string;
  type: BusinessType | "";
  kind: string;
  otherKind: string;
  instagram: string;
  email: string;
  whatsapp: string;
}): string | null {
  if (!v.name.trim()) return "Type the name.";
  if (v.name.trim().length > 160) return "The name is too long (160 letters at most).";
  if (!v.type) return "Choose Restaurant or Shop.";
  if (v.type === "shop" && v.kind === OTHER_KIND && !v.otherKind.trim()) return "Type what kind of shop it is.";
  if (v.otherKind.trim().length > 80) return "The kind of shop is too long (80 letters at most).";
  if (v.instagram.trim() && !handleOk(cleanHandle(v.instagram))) return "The Instagram handle can only have letters, numbers, dots and underscores (30 at most).";
  if (v.email.trim() && !emailOk(v.email.trim())) return "That business email does not look right.";
  if (v.whatsapp.trim() && !whatsappOk(v.whatsapp.trim())) return "The WhatsApp number can only have numbers, spaces, brackets, dashes and a + at the start (7 to 20 characters).";
  return null;
}

// The kind that is saved: the chosen one, or the typed one for "Other".
export const kindToSave = (type: BusinessType, kind: string, otherKind: string): string | null =>
  type === "shop" && kind === OTHER_KIND ? otherKind.trim() || null : kind || null;

// A name with the small differences taken out, so "The Coffee House!" and "coffee  house" match.
export function plainName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .replace(/^(the|al) /, "")
    .trim()
    .replace(/ /g, "");
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length]!;
}

// Names already saved that look like this one: the same, one inside the other, or a typo or two apart.
export function similarNames<T extends { name: string }>(name: string, existing: T[], max = 5): T[] {
  const a = plainName(name);
  if (a.length < 2) return [];
  const hits: { b: T; score: number }[] = [];
  for (const b of existing) {
    const p = plainName(b.name);
    if (!p) continue;
    let score = -1;
    if (p === a) score = 0;
    else if (a.length >= 4 && p.length >= 4 && (p.includes(a) || a.includes(p))) score = 1;
    else if (a.length >= 4 && distance(a, p) <= (a.length >= 8 ? 2 : 1)) score = 2;
    if (score >= 0) hits.push({ b, score });
  }
  return hits.sort((x, y) => x.score - y.score).slice(0, max).map((h) => h.b);
}
