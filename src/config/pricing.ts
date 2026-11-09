// PRICES AND WHAT IS INCLUDED: edit everything about the plans here, and nowhere else.
// The Pricing page, the home page and the How to join page all read this file.
//
// Prices are in AED per month. `null` means "custom" (people talk to us for a price).
// Staff logins: a number, or "unlimited".
//
// NOTE: the "included" lists are a first draft. Please check each line is something you really will
// give, and change, add or remove lines freely.

// PRICES ON THE PUBLIC WEBSITE: Sarah types them on the Pin Desk (dashboard, Website settings). The website reads them
// (src/lib/siteSettings.ts), and a plan with no price typed says "Price to confirm". The numbers written further down in
// this file (priceAed) are NOT shown to visitors any more: they only tell the page whether a plan has a price at all
// (null = "talk to us"). Pages must use priceLabel() with a price from the settings, never print a price themselves.
export const PRICE_TO_CONFIRM = "Price to confirm";
export const priceLabel = (aed: number | null): string => (aed !== null ? `AED ${aed.toLocaleString("en-US")}` : PRICE_TO_CONFIRM);

// The name of each plan's price box on the Pin Desk.
export type PriceGroup = "restaurants" | "shops" | "insider";
export function planPriceKey(group: PriceGroup, id: string): string {
  if (group === "insider") return "insider";
  if (group === "restaurants") return `restaurants.${id === "multi-branch" ? "branches" : id}`;
  return `shops.${id}`;
}
// (the small cards on the Partner page use their own ids)
export function cardPriceKey(c: { group: "restaurants" | "shops"; id: string }): string {
  if (c.group === "restaurants") return `restaurants.${c.id}`;
  return c.id === "shop-8" ? "shops.starter" : c.id === "shop-14" ? "shops.plus" : "shops.pro";
}

// The partner decides their own reward, and it can never be more than this share (shown on the Partner page).
// The partner decides the reward (a percentage off, a freebie, anything). There is no fixed limit on the page.

export const FREE_MONTHS = 2; // the first 2 months are free
export const YEARLY_MONTHS_FREE = 1; // pay yearly and get 1 month free (you pay for 11 months, not 12)

export type Plan = {
  id: string;
  name: string;
  forWho: string; // who the plan is for
  priceAed: number | null;
  staffLogins: number | "unlimited" | null; // null = not applicable / ask us
  included: string[]; // extra lines for this plan (the shared lines are added automatically)
};

// Lines every Spotted Partner plan has.
export const PARTNER_INCLUDED = [
  "Your place on Spotted",
  "Reminders to people who saved you, when they are nearby",
  "Real visits counted with a QR scan",
  "See which Spotted Insider brings you customers",
];

export const RESTAURANT_PLANS: Plan[] = [
  { id: "starter", name: "Starter", forWho: "Cafeterias", priceAed: 99, staffLogins: 7, included: [] },
  { id: "grow", name: "Grow", forWho: "Cafes and bakeries", priceAed: 149, staffLogins: 10, included: [] },
  { id: "main", name: "Main", forWho: "Restaurants with a single cuisine", priceAed: 199, staffLogins: 15, included: [] },
  { id: "premium", name: "Premium", forWho: "Restaurants with several cuisines", priceAed: 249, staffLogins: "unlimited", included: [] },
  { id: "multi-branch", name: "Multi-branch", forWho: "Restaurants with more than one branch", priceAed: 349, staffLogins: "unlimited", included: [] },
  { id: "hotels", name: "Hotels", forWho: "Hotels and hotel restaurants", priceAed: null, staffLogins: null, included: ["Plan made for you: talk to us"] },
];

export const SHOP_PLANS: Plan[] = [
  { id: "starter", name: "Starter", forWho: "Small shops", priceAed: 99, staffLogins: 7, included: [] },
  { id: "plus", name: "Plus", forWho: "Growing shops", priceAed: 199, staffLogins: 10, included: [] },
  { id: "pro", name: "Pro", forWho: "Large shops and shops with several branches", priceAed: 299, staffLogins: "unlimited", included: [] },
];

export const INSIDER_PLAN: Plan = {
  id: "insider",
  name: "Spotted Insider",
  forWho: "Creators",
  priceAed: 249,
  staffLogins: null,
  included: [
    "Yellow stars: someone saved your reel's place",
    "Purple stars: someone visited but did not order",
    "Green stars: someone visited and ordered",
    "Stats for each reel",
  ],
};

// ---- small helpers used by the page (and tested) ----
// What you pay for a year: 12 months, minus the free month(s).
export const yearlyPriceAed = (monthly: number) => monthly * (12 - YEARLY_MONTHS_FREE);

// Founding Insiders: a small group invited to join free while Spotted grows (by invitation only).
export const FOUNDING_SPOTS = 10;
// STILL TO BE DECIDED (6 or 12 months). Change this one line when you decide; the page reads it.
export const FOUNDING_FREE_PERIOD = "[6 or 12 months, still to be decided]";

// The eight small price cards on the Spotted Partner page (step 4).
// Anything food or drink (restaurant, cafe, bakery, sweets, cloud or home kitchen) is a Restaurant; everything else is a Shop
// (the kinds are in src/lib/businessRules.ts). Shop plans are named by how many benefits they have.
// The yearly price is still to be decided: the page shows PARTNER_YEARLY_TBD for each card.
export const PARTNER_YEARLY_TBD = "[TBD]";
export type PartnerCard = { id: string; group: "restaurants" | "shops"; name: string; forWho?: string; priceAed: number; staffLogins: number | "unlimited" };
export const PARTNER_PRICE_CARDS: PartnerCard[] = [
  { id: "starter", group: "restaurants", name: "Starter", forWho: "Cafeterias", priceAed: 99, staffLogins: 7 },
  { id: "grow", group: "restaurants", name: "Grow", forWho: "Cafes, bakeries", priceAed: 149, staffLogins: 10 },
  { id: "main", group: "restaurants", name: "Main", forWho: "One cuisine", priceAed: 199, staffLogins: 15 },
  { id: "premium", group: "restaurants", name: "Premium", forWho: "Many cuisines", priceAed: 249, staffLogins: "unlimited" },
  { id: "branches", group: "restaurants", name: "More than one branch", priceAed: 349, staffLogins: "unlimited" },
  { id: "shop-8", group: "shops", name: "8 benefits", priceAed: 99, staffLogins: 7 },
  { id: "shop-14", group: "shops", name: "14 benefits", priceAed: 199, staffLogins: 10 },
  { id: "shop-20", group: "shops", name: "20+ benefits", priceAed: 299, staffLogins: "unlimited" },
];
