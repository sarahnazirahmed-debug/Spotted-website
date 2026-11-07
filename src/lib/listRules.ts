// Small rules for the three Pin Desk lists and the edit pages. Plain functions, so they can be tested.

export const yesNo = (b: boolean) => (b ? "Yes" : "No");

// "7 Nov 2026, 14:35" (24-hour clock)
export const niceDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Newest first.
export const newestFirst = <T extends { created_at: string }>(rows: T[]): T[] => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

// Words typed in the search box must all appear somewhere in the row's text.
export const matches = (text: string, query: string) => query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.toLowerCase().includes(w));

// Things an admin can mark "Not needed". (The first four are older: kind, Instagram, and the email and WhatsApp one by one.)
export const NOT_NEEDED_KEYS = ["subtype", "instagram_handle", "business_email", "business_whatsapp", "contact", "locations", "reels"] as const;
export type NotNeeded = Partial<Record<(typeof NOT_NEEDED_KEYS)[number], boolean>>;

export type BusinessFacts = {
  name: string;
  type: string | null;
  instagram_handle: string | null;
  business_email: string | null;
  business_whatsapp: string | null;
  not_needed: NotNeeded | null;
};
export type Check = { key: string; label: string; state: "filled" | "not_needed" | "missing" };

// The six things a restaurant or shop needs for its tick. Each is filled in, or marked "Not needed" by an admin.
//   name, type, Instagram handle, at least one location, at least one reel, a business contact (email or WhatsApp).
export function businessChecklist(b: BusinessFacts, counts: { locations: number; reels: number }): Check[] {
  const nn = b.not_needed ?? {};
  const has = (v: string | null) => !!v?.trim();
  const state = (filled: boolean, notNeeded: boolean): Check["state"] => (filled ? "filled" : notNeeded ? "not_needed" : "missing");
  return [
    { key: "name", label: "Name", state: state(has(b.name), false) },
    { key: "type", label: "Type", state: state(has(b.type), false) },
    { key: "instagram_handle", label: "Instagram handle", state: state(has(b.instagram_handle), nn.instagram_handle === true) },
    { key: "locations", label: "At least one location", state: state(counts.locations > 0, nn.locations === true) },
    { key: "reels", label: "At least one reel", state: state(counts.reels > 0, nn.reels === true) },
    { key: "contact", label: "A business contact (email or WhatsApp)", state: state(has(b.business_email) || has(b.business_whatsapp), nn.contact === true || (nn.business_email === true && nn.business_whatsapp === true)) },
  ];
}

// The tick: every one of the six is filled or marked "Not needed".
export const businessComplete = (b: BusinessFacts, counts: { locations: number; reels: number }) => businessChecklist(b, counts).every((c) => c.state !== "missing");

// What changed, in words, for the history list.
export function describeChange(c: { action: string; label: string | null; changes: Record<string, { from: unknown; to: unknown }> }, table: string): string {
  const what = ({ businesses: "restaurant or shop", locations: "location", building_places: "place inside", reels: "reel", reel_items: "item", reel_deals: "deal", reel_deal_prices: "price line", reel_offers: "offer" } as Record<string, string>)[table] ?? table;
  const name = c.label ? ` "${c.label.length > 60 ? `${c.label.slice(0, 57)}...` : c.label}"` : "";
  if (c.action === "added") return `Added ${what}${name}`;
  if (c.action === "removed") return `Removed ${what}${name}`;
  const show = (v: unknown) => {
    const s = v === null || v === undefined ? "(empty)" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return s.length > 60 ? `${s.slice(0, 57)}...` : s;
  };
  const parts = Object.entries(c.changes).map(([k, v]) => `${k.replace(/_/g, " ")}: ${show(v.from)} to ${show(v.to)}`);
  return `Changed ${what}${name}. ${parts.join("; ")}`;
}
