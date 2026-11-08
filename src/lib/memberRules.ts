// The checks for the Insider and Partner dashboards (adding a reel, an item or an offer). Plain functions, so they can be tested.
// The DATABASE checks everything again (supabase/dashboards.sql): these only give a friendly message first.
import { isLink } from "./applyRules.ts";

// A reel: the link is required (only the link is stored, never the video, photo or caption).
export function reelProblem(v: { url: string; placeName: string }): string | null {
  if (!v.url.trim()) return "Please paste the reel link.";
  if (!isLink(v.url) || v.url.trim().length > 500) return "Please check the reel link (it starts with https://).";
  if (v.placeName.trim().length > 160) return "The name is too long.";
  return null;
}

// An item: a name and a price in AED (0 or more, two decimals at most).
export function itemProblem(v: { name: string; price: string }): string | null {
  if (!v.name.trim()) return "Please type the item name.";
  if (v.name.trim().length > 120) return "The item name is too long.";
  const p = v.price.trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(p)) return "Please type the price in AED, for example 12.50.";
  if (Number(p) > 100000) return "That price is too high.";
  return null;
}

// An offer: text, a start date, and an end date OR the tick box "No end date (always on)".
export function offerProblem(v: { text: string; startsOn: string; endsOn: string; alwaysOn: boolean }): string | null {
  if (!v.text.trim()) return "Please type the offer.";
  if (v.text.trim().length > 300) return "The offer is too long (300 letters at most).";
  if (!v.startsOn) return "Please choose the start date.";
  if (!v.alwaysOn) {
    if (!v.endsOn) return "Please choose an end date, or tick No end date (always on).";
    if (v.endsOn < v.startsOn) return "The end date cannot be before the start date.";
  }
  return null;
}

// Is an offer running on this day ("YYYY-MM-DD")?
export const offerIsLive = (o: { starts_on: string; ends_on: string | null; always_on: boolean }, today: string) =>
  o.starts_on <= today && (o.always_on || (o.ends_on !== null && o.ends_on >= today));

// Today as "YYYY-MM-DD" in the visitor's own clock.
export const todayIso = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type MemberKind = "insider" | "partner";
// The dashboard each kind of member belongs to.
export const dashboardPath = (kind: MemberKind) => (kind === "insider" ? "/dashboard/insider" : "/dashboard");
