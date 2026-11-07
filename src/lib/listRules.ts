// Small rules for the three Pin Desk lists and the edit pages. Plain functions, so they can be tested.

export const yesNo = (b: boolean) => (b ? "Yes" : "No");

// "7 Nov 2026, 14:35" (24-hour clock)
export const niceDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Newest first.
export const newestFirst = <T extends { created_at: string }>(rows: T[]): T[] => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

// Words typed in the search box must all appear somewhere in the row's text.
export const matches = (text: string, query: string) => query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.toLowerCase().includes(w));

export const NOT_NEEDED_KEYS = ["subtype", "instagram_handle", "business_email", "business_whatsapp"] as const;
export type NotNeeded = Partial<Record<(typeof NOT_NEEDED_KEYS)[number], boolean>>;

// A restaurant or shop is COMPLETE when its kind, Instagram handle, business email and business WhatsApp
// are each either filled in or marked "not needed".
export function businessComplete(b: { subtype: string | null; instagram_handle: string | null; business_email: string | null; business_whatsapp: string | null; not_needed: NotNeeded | null }): boolean {
  const nn = b.not_needed ?? {};
  return NOT_NEEDED_KEYS.every((k) => !!b[k]?.trim() || nn[k] === true);
}

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
