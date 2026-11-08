"use client";

// The Partner dashboard: five number cards, and two boxes side by side: Items (name and price in AED) and
// Offers (text, start date, end date or "No end date (always on)"). Add and Remove in both.
import { useCallback, useEffect, useState } from "react";
import { text } from "@/content";
import { itemProblem, offerIsLive, offerProblem, todayIso } from "@/lib/memberRules";
import DashboardFrame, { addButton, card, inputCls, labelCls, removeButton, StatCard } from "./DashboardFrame";
import { useMember } from "./useMember";

type Item = { id: string; name: string; price_aed: number };
type Offer = { id: string; text: string; starts_on: string; ends_on: string | null; always_on: boolean };
const t = text.dashboard;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function PartnerDashboard() {
  const { state, numbers, supabase, reload, signOut } = useMember("partner");
  const [items, setItems] = useState<Item[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [itemForm, setItemForm] = useState({ name: "", price: "" });
  const [offerForm, setOfferForm] = useState({ text: "", startsOn: todayIso(), endsOn: "", alwaysOn: false });
  const [itemMsg, setItemMsg] = useState("");
  const [offerMsg, setOfferMsg] = useState("");

  const fetchLists = useCallback(async () => {
    if (!supabase) return { items: [] as Item[], offers: [] as Offer[] };
    const [i, o] = await Promise.all([
      supabase.from("partner_items").select("id, name, price_aed").order("created_at", { ascending: false }),
      supabase.from("partner_offers").select("id, text, starts_on, ends_on, always_on").order("created_at", { ascending: false }),
    ]);
    return { items: (i.data as Item[]) ?? [], offers: (o.data as Offer[]) ?? [] };
  }, [supabase]);

  useEffect(() => {
    if (state !== "ready") return;
    let dead = false;
    void fetchLists().then((l) => {
      if (dead) return;
      setItems(l.items);
      setOffers(l.offers);
    });
    return () => {
      dead = true;
    };
  }, [state, fetchLists]);

  async function refresh() {
    const l = await fetchLists();
    setItems(l.items);
    setOffers(l.offers);
    await reload();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const problem = itemProblem(itemForm);
    if (problem) return setItemMsg(problem);
    const { error } = await supabase!.from("partner_items").insert({ name: itemForm.name.trim(), price_aed: Number(itemForm.price) });
    if (error) return setItemMsg(t.failed);
    setItemForm({ name: "", price: "" });
    setItemMsg("");
    await refresh();
  }
  async function removeItem(i: Item) {
    if (!window.confirm(t.removeAsk)) return;
    const { error } = await supabase!.from("partner_items").delete().eq("id", i.id);
    if (error) return setItemMsg(t.failed);
    await refresh();
  }

  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    const problem = offerProblem(offerForm);
    if (problem) return setOfferMsg(problem);
    const { error } = await supabase!.from("partner_offers").insert({
      text: offerForm.text.trim(),
      starts_on: offerForm.startsOn,
      ends_on: offerForm.alwaysOn ? null : offerForm.endsOn,
      always_on: offerForm.alwaysOn,
    });
    if (error) return setOfferMsg(t.failed);
    setOfferForm({ text: "", startsOn: todayIso(), endsOn: "", alwaysOn: false });
    setOfferMsg("");
    await refresh();
  }
  async function removeOffer(o: Offer) {
    if (!window.confirm(t.removeAsk)) return;
    const { error } = await supabase!.from("partner_offers").delete().eq("id", o.id);
    if (error) return setOfferMsg(t.failed);
    await refresh();
  }

  const n = numbers;
  const today = todayIso();
  return (
    <DashboardFrame title={t.partnerTitle} state={state} signOut={signOut} numbers={n}>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t.greenStars} value={n?.green_stars ?? 0} star="visit" />
        <StatCard label={t.yellowStars} value={n?.yellow_stars ?? 0} star="sale" note={t.salesRecorded} />
        <StatCard label={t.saves} value={n?.saves ?? 0} />
        <StatCard label={t.items} value={n?.items ?? 0} />
        <StatCard label={t.offersLive} value={n?.offers_live ?? 0} />
      </ul>

      <div className="mt-8 grid items-start gap-6 md:grid-cols-2">
        {/* ITEMS */}
        <section className={card}>
          <h2 className="font-brand text-2xl font-bold">{t.itemsTitle}</h2>
          <form onSubmit={addItem} noValidate className="mt-4 grid gap-3">
            <div>
              <label htmlFor="item-name" className={labelCls}>{t.itemName}</label>
              <input id="item-name" className={inputCls} value={itemForm.name} onChange={(e) => { setItemForm({ ...itemForm, name: e.target.value }); setItemMsg(""); }} />
            </div>
            <div>
              <label htmlFor="item-price" className={labelCls}>{t.itemPrice}</label>
              <input id="item-price" inputMode="decimal" className={inputCls} placeholder="12.50" value={itemForm.price} onChange={(e) => { setItemForm({ ...itemForm, price: e.target.value }); setItemMsg(""); }} />
            </div>
            {itemMsg && <p role="alert" className="text-base font-bold text-problem">{itemMsg}</p>}
            <div><button type="submit" className={addButton}>{t.add}</button></div>
          </form>
          <ul className="mt-5 grid gap-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-pinktint px-4 py-2">
                <span className="min-w-0 break-words font-semibold">{i.name} <span className="text-mutedtext">- AED {Number(i.price_aed).toFixed(2)}</span></span>
                <button type="button" onClick={() => removeItem(i)} className={removeButton}>{t.remove}</button>
              </li>
            ))}
            {items.length === 0 && <li className="text-base text-mutedtext">{t.noItems}</li>}
          </ul>
        </section>

        {/* OFFERS */}
        <section className={card}>
          <h2 className="font-brand text-2xl font-bold">{t.offersTitle}</h2>
          <form onSubmit={addOffer} noValidate className="mt-4 grid gap-3">
            <div>
              <label htmlFor="offer-text" className={labelCls}>{t.offerText}</label>
              <input id="offer-text" className={inputCls} value={offerForm.text} onChange={(e) => { setOfferForm({ ...offerForm, text: e.target.value }); setOfferMsg(""); }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="offer-start" className={labelCls}>{t.startDate}</label>
                <input id="offer-start" type="date" className={`${inputCls} [color-scheme:light]`} value={offerForm.startsOn} onChange={(e) => setOfferForm({ ...offerForm, startsOn: e.target.value })} />
              </div>
              <div>
                <label htmlFor="offer-end" className={labelCls}>{t.endDate}</label>
                <input id="offer-end" type="date" disabled={offerForm.alwaysOn} className={`${inputCls} [color-scheme:light] disabled:opacity-50`} value={offerForm.endsOn} onChange={(e) => setOfferForm({ ...offerForm, endsOn: e.target.value })} />
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input type="checkbox" checked={offerForm.alwaysOn} onChange={(e) => setOfferForm({ ...offerForm, alwaysOn: e.target.checked, endsOn: "" })} className="size-6 accent-maroon" />
              {t.noEnd}
            </label>
            {offerMsg && <p role="alert" className="text-base font-bold text-problem">{offerMsg}</p>}
            <div><button type="submit" className={addButton}>{t.add}</button></div>
          </form>
          <ul className="mt-5 grid gap-2">
            {offers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-pinktint px-4 py-2">
                <span className="min-w-0 break-words">
                  <span className="font-semibold">{o.text}</span>
                  <span className="block text-sm text-mutedtext">
                    {fmtDate(o.starts_on)} - {o.always_on ? t.alwaysOn : fmtDate(o.ends_on ?? o.starts_on)}
                    {" "}({offerIsLive(o, today) ? t.live : t.notLive})
                  </span>
                </span>
                <button type="button" onClick={() => removeOffer(o)} className={removeButton}>{t.remove}</button>
              </li>
            ))}
            {offers.length === 0 && <li className="text-base text-mutedtext">{t.noOffers}</li>}
          </ul>
        </section>
      </div>
    </DashboardFrame>
  );
}
