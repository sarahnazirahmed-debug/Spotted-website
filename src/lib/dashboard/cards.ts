// The list of dashboard cards. To add, rename or remove a card, change this list.
//
// source "real"    = the numbers come from the database today (sign-ups, Insiders joined, reels linked,
//                    trials, visits). If the database cannot be reached, the page shows EXAMPLE numbers.
// source "example" = there is no real data yet (it needs the app, or payments), so the page shows numbers
//                    that are clearly labelled EXAMPLE.
// money: true      = only the main admin and associates see it. Staff never do.
import { HOLIDAYS, EXAMPLE_PLACES } from "./example.ts";
import { WEEKDAYS } from "./time.ts";

export type CardGroup = "app" | "influencers" | "restaurants";
export type SeriesDef = {
  id: string;
  label: string;
  metric?: string; // the name of the real number from dashboard_real()
  base: number; // example only: a typical number per day, worldwide
  aed?: boolean; // shown as AED
};

export type CardDef = {
  id: string;
  group: CardGroup;
  title: string;
  help?: string;
  source: "real" | "example";
  money?: boolean;
  direction?: "past" | "future";
} & (
  | { kind: "series"; series: SeriesDef[]; derived?: "retention" }
  | { kind: "breakdown"; items: string[] | "cities"; ranked: boolean; base: number; aed?: boolean; keep?: number }
  | { kind: "influencer" }
);

export const GROUP_TITLE: Record<CardGroup, string> = {
  app: "The app",
  influencers: "Insiders (influencers)",
  restaurants: "Restaurants (later)",
};

export const CARDS: CardDef[] = [
  // ---- The app ----
  { id: "signups", group: "app", title: "Sign-ups", source: "real", kind: "series", series: [{ id: "signups", label: "Sign-ups", metric: "signups", base: 30 }] },
  { id: "notifications", group: "app", title: "Notifications sent", source: "example", kind: "series", series: [{ id: "n", label: "Notifications", base: 420 }] },
  { id: "active", group: "app", title: "People who used the app", source: "example", kind: "series", series: [{ id: "a", label: "People", base: 260 }] },
  {
    id: "visits",
    group: "app",
    title: "Likely visits",
    help: "\"I went\" taps plus directions opened.",
    source: "example",
    kind: "series",
    series: [
      { id: "went", label: "\"I went\" taps", base: 40 },
      { id: "directions", label: "Directions opened", base: 65 },
    ],
  },
  {
    id: "saves",
    group: "app",
    title: "Saves by platform",
    source: "example",
    kind: "series",
    series: [
      { id: "instagram", label: "Instagram", base: 180 },
      { id: "tiktok", label: "TikTok", base: 110 },
      { id: "youtube", label: "YouTube", base: 35 },
    ],
  },
  { id: "busiest", group: "app", title: "Busiest days for saves", source: "example", kind: "breakdown", items: WEEKDAYS, ranked: false, base: 40 },
  { id: "places", group: "app", title: "Most saved places", source: "example", kind: "breakdown", items: EXAMPLE_PLACES, ranked: true, base: 9, keep: 8 },
  { id: "cities", group: "app", title: "Top cities", source: "example", kind: "breakdown", items: "cities", ranked: true, base: 60 },
  {
    id: "retention",
    group: "app",
    title: "People who came back",
    help: "Of the people who signed up in each period, how many came back 7 and 30 days later.",
    source: "example",
    kind: "series",
    derived: "retention",
    series: [
      { id: "cohort", label: "Signed up", base: 30 },
      { id: "back7", label: "Back after 7 days", base: 0 },
      { id: "back30", label: "Back after 30 days", base: 0 },
    ],
  },

  // ---- Insiders (influencers) ----
  { id: "joined", group: "influencers", title: "Insiders joined", source: "real", kind: "series", series: [{ id: "joined", label: "Joined", metric: "influencers_joined", base: 1.2 }] },
  { id: "reels", group: "influencers", title: "Reels linked", source: "real", kind: "series", series: [{ id: "reels", label: "Reels linked", metric: "reels_linked", base: 14 }] },
  { id: "influencer", group: "influencers", title: "One Insider: reels, visits and visits per reel", source: "real", kind: "influencer" },
  {
    id: "subscribers",
    group: "influencers",
    title: "New subscribers",
    help: "Monthly and yearly plans.",
    source: "example",
    kind: "series",
    series: [
      { id: "monthly", label: "Monthly", base: 1.6 },
      { id: "yearly", label: "Yearly", base: 0.7 },
    ],
  },
  {
    id: "earnings",
    group: "influencers",
    title: "Earnings from Insiders",
    source: "example",
    money: true,
    kind: "series",
    series: [
      { id: "monthly", label: "Monthly plans", base: 400, aed: true },
      { id: "yearly", label: "Yearly plans", base: 1900, aed: true },
    ],
  },
  { id: "cancellations", group: "influencers", title: "Cancellations", source: "example", kind: "series", series: [{ id: "c", label: "Cancellations", base: 0.5 }] },
  { id: "trials_started", group: "influencers", title: "Trials started", source: "real", kind: "series", series: [{ id: "t", label: "Trials started", metric: "trials_started", base: 1.1 }] },
  {
    id: "trials_ending",
    group: "influencers",
    title: "Trials ending",
    help: "Looking ahead: the free 2 months end 2 months after they start.",
    source: "real",
    direction: "future",
    kind: "series",
    series: [{ id: "e", label: "Trials ending", metric: "trials_ending", base: 1.1 }],
  },
  { id: "renewals", group: "influencers", title: "Renewals due", help: "Looking ahead.", source: "example", direction: "future", kind: "series", series: [{ id: "r", label: "Renewals due", base: 1.4 }] },
  {
    id: "insider_total",
    group: "influencers",
    title: "Total Insider earnings",
    source: "example",
    money: true,
    kind: "breakdown",
    items: ["Monthly plans", "Yearly plans"],
    ranked: false,
    base: 1500,
    aed: true,
  },

  // ---- Restaurants (later): needs the app and payments, so all example for now ----
  {
    id: "coupons",
    group: "restaurants",
    title: "Coupons and uses",
    source: "example",
    kind: "series",
    series: [
      { id: "created", label: "Coupons created", base: 0.8 },
      { id: "used", label: "Coupon uses", base: 14 },
    ],
  },
  { id: "money_generated", group: "restaurants", title: "Money generated", source: "example", money: true, kind: "series", series: [{ id: "m", label: "Money generated", base: 1100, aed: true }] },
  { id: "holidays", group: "restaurants", title: "Holidays with the most customers", source: "example", kind: "breakdown", items: HOLIDAYS, ranked: true, base: 4 },
  { id: "green_weekday", group: "restaurants", title: "Green stars by weekday", help: "Someone visited and ordered.", source: "example", kind: "breakdown", items: WEEKDAYS, ranked: false, base: 6 },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id);
