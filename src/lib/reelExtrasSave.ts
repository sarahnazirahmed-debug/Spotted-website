// Save the deals and offers of a reel. New ones are added, old ones are changed, taken-off ones are deleted.
// Only the main admin and associates may delete; if that is not allowed we say so instead of pretending it worked.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deal, Offer } from "./reelDeals";

export type Extras = { deals: Deal[]; offers: Offer[]; removedDealIds: string[]; removedOfferIds: string[] };

export async function saveReelExtras(db: SupabaseClient, reelId: string, extras: Extras, oldDeals: Deal[]): Promise<string | null> {
  const fail = (what: string, message: string) => `${what} did not save (${message}).`;
  let onlineNote: string | null = null;
  for (const o of extras.offers) {
    const row = { title: o.title, discount: o.discount, conditions: o.conditions, end_date: o.end_date };
    const online = { where_kind: o.where_kind ?? "place", online_name: o.online_name ?? null, promo_code: o.promo_code ?? null, business_id: o.business_id ?? null };
    const write = (values: Record<string, unknown>) => (o.id ? db.from("reel_offers").update(values).eq("id", o.id) : db.from("reel_offers").insert({ ...values, reel_id: reelId }));
    let r = await write({ ...row, ...online });
    // FAST CAPTURE: if the online fields are not in the database yet (pindesk_online.sql not run), save the offer without them.
    if (r.error && /where_kind|online_name|promo_code|business_id|nearby_ok/.test(r.error.message)) {
      r = await write(row);
      if (!r.error) onlineNote = "the online details were not saved yet: run supabase/pindesk_online.sql in Supabase first.";
    }
    if (r.error) return fail(`The offer "${o.title}"`, r.error.message);
  }
  for (const d of extras.deals) {
    const row = { title: d.title, included: d.included, conditions: d.conditions, end_date: d.end_date };
    let id = d.id;
    if (id) {
      const r = await db.from("reel_deals").update(row).eq("id", id);
      if (r.error) return fail(`The deal "${d.title}"`, r.error.message);
    } else {
      const r = await db.from("reel_deals").insert({ ...row, reel_id: reelId }).select("id").single();
      if (r.error || !r.data) return fail(`The deal "${d.title}"`, r.error?.message ?? "no answer");
      id = (r.data as { id: string }).id;
    }
    const up = await db.from("reel_deal_prices").upsert(d.prices.map((p) => ({ deal_id: id, people: p.people, total_price_aed: p.total_price_aed })), { onConflict: "deal_id,people" });
    if (up.error) return fail(`The prices of "${d.title}"`, up.error.message);
    const old = oldDeals.find((x) => x.id === d.id)?.prices.map((p) => p.people) ?? [];
    const gone = old.filter((n) => !d.prices.some((p) => p.people === n));
    if (gone.length > 0) {
      const del = await db.from("reel_deal_prices").delete().eq("deal_id", id).in("people", gone).select("id");
      if (del.error || (del.data?.length ?? 0) < gone.length) return "only the main admin and associates can remove a price line.";
    }
  }
  if (extras.removedDealIds.length > 0) {
    const del = await db.from("reel_deals").delete().in("id", extras.removedDealIds).select("id");
    if (del.error || (del.data?.length ?? 0) < extras.removedDealIds.length) return "only the main admin and associates can remove a deal.";
  }
  if (extras.removedOfferIds.length > 0) {
    const del = await db.from("reel_offers").delete().in("id", extras.removedOfferIds).select("id");
    if (del.error || (del.data?.length ?? 0) < extras.removedOfferIds.length) return "only the main admin and associates can remove an offer.";
  }
  return onlineNote;
}
