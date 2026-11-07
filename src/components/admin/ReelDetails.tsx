// What a reel shows: when it was posted (and how long ago), the items seen in it, its deals and its offers.
// Nothing is hidden automatically, even if an end date has passed.
import type { Dish } from "@/lib/dishes";
import { money, priceLine, type Deal, type Offer } from "@/lib/reelDeals";
import { niceDay, SEEN_IN_A_REEL, timeAgo } from "@/lib/timeAgo";

export default function ReelDetails({ postedOn, dishes, deals, offers, businessNames }: { postedOn: string | null; dishes: Dish[]; deals: Deal[]; offers: Offer[]; businessNames?: Map<string, string> }) {
  const ago = postedOn ? timeAgo(postedOn) : "";
  const hasAny = dishes.length > 0 || deals.length > 0 || offers.length > 0;
  if (!postedOn && !hasAny) return null;
  return (
    <div className="mt-2 grid gap-2 text-sm">
      {postedOn && <p className="font-bold">Posted {niceDay(postedOn)}{ago ? ` (${ago})` : ""}</p>}
      {dishes.length > 0 && (
        <ul className="grid gap-0.5">
          {dishes.map((d, i) => <li key={i}>{d.name}: {money(d.price_aed)}</li>)}
        </ul>
      )}
      {deals.map((d, i) => (
        <div key={d.id ?? i} className="rounded-xl bg-alt p-2 text-onpage">
          <p className="font-extrabold">Deal: {d.title}</p>
          <ul>{[...d.prices].sort((a, b) => a.people - b.people).map((p) => <li key={p.people}>{priceLine(p)}</li>)}</ul>
          {d.included && <p>Included: {d.included}</p>}
          {d.conditions && <p>Conditions: {d.conditions}</p>}
          {d.end_date && <p>Ends {niceDay(d.end_date)}</p>}
        </div>
      ))}
      {offers.map((o, i) => (
        <div key={o.id ?? i} className="rounded-xl bg-alt p-2 text-onpage">
          <p className="font-extrabold">Offer: {o.title}</p>
          {o.discount && <p>{o.discount}</p>}
          {o.where_kind === "online" && <p>Online{o.online_name ? `: ${o.online_name}` : ""} (not used for nearby reminders)</p>}
          {o.promo_code && <p>Promo code: {o.promo_code}</p>}
          {o.business_id && businessNames?.get(o.business_id) && <p>For: {businessNames.get(o.business_id)}</p>}
          {o.conditions && <p>Conditions: {o.conditions}</p>}
          {o.end_date && <p>Ends {niceDay(o.end_date)}</p>}
        </div>
      ))}
      {hasAny && <p className="text-mist">{SEEN_IN_A_REEL}</p>}
    </div>
  );
}
