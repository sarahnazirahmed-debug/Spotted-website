// "Order only" businesses: home bakeries, home kitchens, cloud kitchens. Plain functions for the forms, lists and tests.
//
// RULES:
//  * NEVER store or show a home address. There is no address field. "Where they deliver" is emirates and typed AREAS only.
//  * Everything is optional and nothing here ever blocks a save (fast capture). Text that is too long is cut short.
//  * ORDER-ONLY PLACES ARE NEVER USED FOR NEARBY REMINDERS.
import { EMIRATES } from "./pinRules.ts";

export type Access = "place" | "order_only" | "both";

export const ACCESS_LABEL: Record<Access, string> = {
  place: "Has a place to visit",
  order_only: "Order only (no place to visit)",
  both: "Both",
};

export const ADDRESS_NOTE = "Never type a home address. There is no address box on purpose. Write the areas only, for example Khalifa City or Mussafah.";

export type OrderDraft = { access: Access; viaInstagram: boolean; viaWhatsapp: boolean; website: string; app: string; emirates: string[]; areas: string };
export const emptyOrder = (): OrderDraft => ({ access: "place", viaInstagram: false, viaWhatsapp: false, website: "", app: "", emirates: [], areas: "" });

// What is saved. Nothing here can fail: it trims, cuts and drops what does not fit.
export type OrderFields = {
  access_kind: Access;
  order_instagram: boolean;
  order_whatsapp: boolean;
  order_website: string | null;
  order_app: string | null;
  deliver_emirates: string[];
  deliver_areas: string | null;
};
const t = (s: string, max: number) => s.trim().slice(0, max) || null;
export function cleanOrder(d: OrderDraft): OrderFields {
  return {
    access_kind: d.access,
    order_instagram: d.viaInstagram,
    order_whatsapp: d.viaWhatsapp,
    order_website: t(d.website, 200),
    order_app: t(d.app, 80),
    deliver_emirates: EMIRATES.filter((e) => d.emirates.includes(e)),
    deliver_areas: t(d.areas, 500),
  };
}

// The order fields as the database holds them (older rows may not have them at all).
export type OrderRow = Partial<{
  access_kind: Access;
  order_instagram: boolean;
  order_whatsapp: boolean;
  order_website: string | null;
  order_app: string | null;
  deliver_emirates: string[] | null;
  deliver_areas: string | null;
}>;

export const draftFromRow = (r: OrderRow): OrderDraft => ({
  access: r.access_kind ?? "place",
  viaInstagram: r.order_instagram ?? false,
  viaWhatsapp: r.order_whatsapp ?? false,
  website: r.order_website ?? "",
  app: r.order_app ?? "",
  emirates: r.deliver_emirates ?? [],
  areas: r.deliver_areas ?? "",
});

// Is "How to order" filled in? Any one way is enough.
export const orderFilled = (r: OrderRow) => !!(r.order_instagram || r.order_whatsapp || r.order_website?.trim() || r.order_app?.trim());

// The ways to order, in words, for the pages.
export function orderWays(r: OrderRow, instagramHandle?: string | null, whatsapp?: string | null): string[] {
  const ways: string[] = [];
  if (r.order_instagram) ways.push(instagramHandle ? `Instagram message (@${instagramHandle})` : "Instagram message");
  if (r.order_whatsapp) ways.push(whatsapp ? `Business WhatsApp (${whatsapp})` : "Business WhatsApp");
  if (r.order_website?.trim()) ways.push(`Website: ${r.order_website.trim()}`);
  if (r.order_app?.trim()) ways.push(`App: ${r.order_app.trim()}`);
  return ways;
}

export const isOrderOnly = (r: OrderRow) => r.access_kind === "order_only";
export const hasOrdering = (r: OrderRow) => r.access_kind === "order_only" || r.access_kind === "both";

// A gentle warning (never a block) when the "areas" text looks like a home address.
const ADDRESS_WORDS = /\b(villa|flat|apt|apartment|building|bldg|floor|house|unit|room|street|st\.|p\.?\s?o\.?\s?box|plot)\b/i;
export const looksLikeAddress = (text: string) => ADDRESS_WORDS.test(text) || /#\s*\d/.test(text) || /\b(?:no\.?|number)\s*\d/i.test(text);

// ORDER-ONLY PLACES ARE NEVER USED FOR NEARBY REMINDERS. Anything that builds reminders must take its places through this.
export const placesForNearby = <T extends { access_kind?: Access }>(rows: T[]): T[] => rows.filter((r) => r.access_kind !== "order_only");

// If the new columns are not in the database yet (pindesk_order_only.sql not run), the save is retried without them.
export const ORDER_COLUMN_WORDS = /access_kind|order_instagram|order_whatsapp|order_website|order_app|deliver_emirates|deliver_areas|nearby_ok/;
export const RUN_THE_FILE = "the order-only details were not saved yet: run supabase/pindesk_order_only.sql in Supabase first.";
