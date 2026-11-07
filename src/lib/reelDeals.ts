// Deals and offers on a reel. Plain functions for the form, the list and the tests.
//   REEL DEAL  : title, one or more price lines (people + total price in AED), what is included, conditions, end date (only if the reel states one).
//   REEL OFFER : title, the discount (25% off, buy one get one, free dessert), conditions, end date (only if the reel states one).
// A reel can hold several of each. Nothing is ever hidden automatically, not even when an end date has passed.

export type DealDraft = { id?: string; title: string; included: string; conditions: string; endDate: string; prices: { people: string; total: string }[] };
export type Where = "place" | "online";
export type OfferDraft = { id?: string; title: string; discount: string; conditions: string; endDate: string; where: Where; appName: string; promo: string; businessId: string };

export type Deal = { id?: string; title: string; included: string | null; conditions: string | null; end_date: string | null; prices: { people: number; total_price_aed: number }[] };
export type Offer = {
  id?: string;
  title: string;
  discount: string | null;
  conditions: string | null;
  end_date: string | null;
  // online offers (all optional; older offers have none of these and count as "At the place")
  where_kind?: Where;
  online_name?: string | null;
  promo_code?: string | null;
  business_id?: string | null;
};

// Suggestions for "App or website name". Anything else can be typed.
export const ONLINE_APPS = ["Smiles", "Noon", "Talabat", "Deliveroo", "Careem"];
export const WHERE_LABEL: Record<Where, string> = { place: "At the place", online: "Online or in an app" };

export const emptyDeal = (): DealDraft => ({ title: "", included: "", conditions: "", endDate: "", prices: [{ people: "", total: "" }] });
export const emptyOffer = (): OfferDraft => ({ title: "", discount: "", conditions: "", endDate: "", where: "place", appName: "", promo: "", businessId: "" });

const blankDeal = (d: DealDraft) => !d.title.trim() && !d.included.trim() && !d.conditions.trim() && !d.endDate && d.prices.every((p) => !p.people.trim() && !p.total.trim());
const blankOffer = (o: OfferDraft) => !o.title.trim() && !o.discount.trim() && !o.conditions.trim() && !o.endDate && !(o.appName ?? "").trim() && !(o.promo ?? "").trim() && !o.businessId;
const t = (s: string) => (s.trim() === "" ? null : s.trim());
const aed = (s: string) => Number(s.trim().replace(/,/g, "."));

export function cleanDeals(drafts: DealDraft[]): { deals: Deal[]; problem: string | null } {
  const deals: Deal[] = [];
  for (const [i, d] of drafts.entries()) {
    if (blankDeal(d)) continue;
    const n = `Deal ${i + 1}`;
    if (!d.title.trim()) return { deals: [], problem: `${n} needs a title.` };
    if (d.title.trim().length > 160) return { deals: [], problem: `${n}: the title is too long (160 letters at most).` };
    if (d.included.length > 2000 || d.conditions.length > 2000) return { deals: [], problem: `${n}: the text is too long (2000 letters at most).` };
    const lines = d.prices.filter((p) => p.people.trim() || p.total.trim());
    if (lines.length === 0) return { deals: [], problem: `${n} needs at least one price line (number of people and the total price in AED).` };
    const seen = new Set<number>();
    const prices: Deal["prices"] = [];
    for (const p of lines) {
      const people = Number(p.people.trim());
      const total = aed(p.total);
      if (!Number.isInteger(people) || people < 1 || people > 100) return { deals: [], problem: `${n}: the number of people must be a whole number from 1 to 100.` };
      if (p.total.trim() === "" || !Number.isFinite(total) || total < 0) return { deals: [], problem: `${n}: every price line needs the total price in AED (0 or more).` };
      if (seen.has(people)) return { deals: [], problem: `${n}: there are two price lines for ${people} ${people === 1 ? "person" : "people"}.` };
      seen.add(people);
      prices.push({ people, total_price_aed: Math.round(total * 100) / 100 });
    }
    deals.push({ id: d.id, title: d.title.trim(), included: t(d.included), conditions: t(d.conditions), end_date: d.endDate || null, prices });
  }
  return { deals, problem: null };
}

export function cleanOffers(drafts: OfferDraft[]): { offers: Offer[]; problem: string | null } {
  const offers: Offer[] = [];
  for (const [i, o] of drafts.entries()) {
    if (blankOffer(o)) continue;
    const n = `Offer ${i + 1}`;
    const online = o.where === "online";
    // FAST CAPTURE: an online offer never blocks a save. A missing title is filled in from what was typed, and long text is cut short.
    const title = o.title.trim() || (online ? o.discount.trim() || (o.appName ?? "").trim() || (o.promo ?? "").trim() || "Online offer" : "");
    if (!online) {
      if (!title) return { offers: [], problem: `${n} needs a title.` };
      if (!o.discount.trim()) return { offers: [], problem: `${n} needs the discount (for example 25% off, buy one get one, free dessert).` };
      if (title.length > 160) return { offers: [], problem: `${n}: the title is too long (160 letters at most).` };
      if (o.discount.length > 200 || o.conditions.length > 2000) return { offers: [], problem: `${n}: the text is too long.` };
    }
    offers.push({
      id: o.id,
      title: title.slice(0, 160),
      discount: t(o.discount)?.slice(0, 200) ?? null,
      conditions: t(o.conditions)?.slice(0, 2000) ?? null,
      end_date: o.endDate || null,
      where_kind: o.where,
      online_name: online ? (t(o.appName ?? "")?.slice(0, 80) ?? null) : null,
      promo_code: t(o.promo ?? "")?.slice(0, 40) ?? null,
      business_id: o.businessId || null,
    });
  }
  return { offers, problem: null };
}

// ONLINE OFFERS ARE NEVER USED FOR NEARBY REMINDERS. Anything that builds reminders must take its offers through this.
export const offersForNearby = <T extends { where_kind?: Where }>(offers: T[]): T[] => offers.filter((o) => (o.where_kind ?? "place") === "place");

// "AED 120" or "AED 99.50"
export const money = (n: number) => `AED ${Number.isInteger(n) ? n : n.toFixed(2)}`;
export const perPerson = (total: number, people: number) => Math.round((total / people) * 100) / 100;

// Both prices are always shown: the total and the price for one person.
export const priceLine = (p: { people: number; total_price_aed: number }) =>
  `${p.people} ${p.people === 1 ? "person" : "people"}: ${money(p.total_price_aed)} total, ${money(perPerson(p.total_price_aed, p.people))} per person`;

export const draftFromDeal = (d: Deal): DealDraft => ({
  id: d.id, title: d.title, included: d.included ?? "", conditions: d.conditions ?? "", endDate: d.end_date ?? "",
  prices: [...d.prices].sort((a, b) => a.people - b.people).map((p) => ({ people: String(p.people), total: String(p.total_price_aed) })),
});
export const draftFromOffer = (o: Offer): OfferDraft => ({ id: o.id, title: o.title, discount: o.discount ?? "", conditions: o.conditions ?? "", endDate: o.end_date ?? "", where: o.where_kind ?? "place", appName: o.online_name ?? "", promo: o.promo_code ?? "", businessId: o.business_id ?? "" });
