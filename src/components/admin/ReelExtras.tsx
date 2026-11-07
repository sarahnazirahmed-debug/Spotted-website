"use client";

// The "This reel has a deal" part of the reel form: two optional boxes, REEL DEAL and REEL OFFER. A reel can hold several of each.
import { emptyDeal, emptyOffer, type DealDraft, type OfferDraft } from "@/lib/reelDeals";

const field = "min-h-11 w-full rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";
const small = "min-h-11 rounded-full border-2 border-line px-5 font-extrabold";

export default function ReelExtras({ open, setOpen, deals, setDeals, offers, setOffers }: {
  open: boolean;
  setOpen: (o: boolean) => void;
  deals: DealDraft[];
  setDeals: (d: DealDraft[]) => void;
  offers: OfferDraft[];
  setOffers: (o: OfferDraft[]) => void;
}) {
  const upDeal = (i: number, patch: Partial<DealDraft>) => setDeals(deals.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const upOffer = (i: number, patch: Partial<OfferDraft>) => setOffers(offers.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  if (!open)
    return (
      <button type="button" onClick={() => { setOpen(true); if (deals.length === 0) setDeals([emptyDeal()]); if (offers.length === 0) setOffers([emptyOffer()]); }} className={`${small} w-fit`}>
        This reel has a deal
      </button>
    );

  return (
    <div className="grid gap-4 rounded-2xl bg-alt p-4 text-onpage">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold">This reel has a deal</p>
        <button type="button" onClick={() => setOpen(false)} className={small}>Hide these boxes</button>
      </div>
      <p className="text-sm font-bold">Both boxes are optional. Only write what the reel itself shows or says.</p>

      {/* REEL DEAL */}
      <fieldset className="grid gap-3">
        <legend className="text-lg font-extrabold">Reel deal</legend>
        {deals.map((d, i) => (
          <div key={i} className="grid gap-3 rounded-xl bg-paper p-3 text-charcoal">
            <div>
              <label className={label} htmlFor={`deal-title-${i}`}>Deal {i + 1}: title</label>
              <input id={`deal-title-${i}`} className={field} value={d.title} onChange={(e) => upDeal(i, { title: e.target.value })} maxLength={160} />
            </div>
            <fieldset className="grid gap-2">
              <legend className={label}>Price lines (number of people and the total price in AED)</legend>
              {d.prices.map((p, k) => (
                <div key={k} className="flex flex-wrap gap-2">
                  <input aria-label={`Deal ${i + 1} line ${k + 1} number of people`} placeholder="People" inputMode="numeric" className={`${field} max-w-28`} value={p.people} onChange={(e) => upDeal(i, { prices: d.prices.map((x, j) => (j === k ? { ...x, people: e.target.value } : x)) })} />
                  <input aria-label={`Deal ${i + 1} line ${k + 1} total price in AED`} placeholder="Total AED" inputMode="decimal" className={`${field} max-w-36`} value={p.total} onChange={(e) => upDeal(i, { prices: d.prices.map((x, j) => (j === k ? { ...x, total: e.target.value } : x)) })} />
                  {d.prices.length > 1 && (
                    <button type="button" aria-label={`Remove deal ${i + 1} price line ${k + 1}`} onClick={() => upDeal(i, { prices: d.prices.filter((_, j) => j !== k) })} className={small}>X</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => upDeal(i, { prices: [...d.prices, { people: "", total: "" }] })} className={`${small} w-fit`}>Add a price line</button>
            </fieldset>
            <div>
              <label className={label} htmlFor={`deal-inc-${i}`}>What is included</label>
              <textarea id={`deal-inc-${i}`} rows={2} className={`${field} py-2`} value={d.included} onChange={(e) => upDeal(i, { included: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor={`deal-cond-${i}`}>Conditions</label>
              <textarea id={`deal-cond-${i}`} rows={2} className={`${field} py-2`} value={d.conditions} onChange={(e) => upDeal(i, { conditions: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor={`deal-end-${i}`}>End date (only if the reel states one)</label>
              <input id={`deal-end-${i}`} type="date" className={field} value={d.endDate} onChange={(e) => upDeal(i, { endDate: e.target.value })} />
            </div>
            <button type="button" onClick={() => setDeals(deals.filter((_, j) => j !== i))} className={`${small} w-fit`}>Remove deal {i + 1}</button>
          </div>
        ))}
        <button type="button" onClick={() => setDeals([...deals, emptyDeal()])} className={`${small} w-fit`}>Add another deal</button>
      </fieldset>

      {/* REEL OFFER */}
      <fieldset className="grid gap-3">
        <legend className="text-lg font-extrabold">Reel offer</legend>
        {offers.map((o, i) => (
          <div key={i} className="grid gap-3 rounded-xl bg-paper p-3 text-charcoal">
            <div>
              <label className={label} htmlFor={`offer-title-${i}`}>Offer {i + 1}: title</label>
              <input id={`offer-title-${i}`} className={field} value={o.title} onChange={(e) => upOffer(i, { title: e.target.value })} maxLength={160} />
            </div>
            <div>
              <label className={label} htmlFor={`offer-disc-${i}`}>The discount (for example 25% off, buy one get one, free dessert)</label>
              <input id={`offer-disc-${i}`} className={field} value={o.discount} onChange={(e) => upOffer(i, { discount: e.target.value })} maxLength={200} />
            </div>
            <div>
              <label className={label} htmlFor={`offer-cond-${i}`}>Conditions</label>
              <textarea id={`offer-cond-${i}`} rows={2} className={`${field} py-2`} value={o.conditions} onChange={(e) => upOffer(i, { conditions: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor={`offer-end-${i}`}>End date (only if the reel states one)</label>
              <input id={`offer-end-${i}`} type="date" className={field} value={o.endDate} onChange={(e) => upOffer(i, { endDate: e.target.value })} />
            </div>
            <button type="button" onClick={() => setOffers(offers.filter((_, j) => j !== i))} className={`${small} w-fit`}>Remove offer {i + 1}</button>
          </div>
        ))}
        <button type="button" onClick={() => setOffers([...offers, emptyOffer()])} className={`${small} w-fit`}>Add another offer</button>
      </fieldset>
    </div>
  );
}
