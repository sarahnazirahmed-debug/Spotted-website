"use client";

// The reel form: used to add a new reel and to edit one. All the fields of the "reels" table.
import { useState } from "react";
import { similarNames } from "@/lib/businessRules";
import { locationFits, locationGroups, postedOnProblem, type BizOption, type LocOption } from "@/lib/reelPlace";
import { cleanDeals, cleanOffers, draftFromDeal, draftFromOffer, type Deal, type DealDraft, type Offer, type OfferDraft } from "@/lib/reelDeals";
import { useAdmin } from "./AdminProvider";
import ReelExtras from "./ReelExtras";
import type { Extras } from "@/lib/reelExtrasSave";
import { cleanDishes, MAX_DISHES } from "@/lib/dishes";
import { mapsSearchUrl, readMapsPin } from "@/lib/mapsLink";
import { CATEGORIES, EMIRATES, pinProblem, STATUS_LABEL, type ReelStatus } from "@/lib/pinRules";
import type { Reel, ReelInput } from "@/lib/reelTypes";

const field = "min-h-11 w-full rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";
const num = (v: string): number | null => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));

type Props = {
  // For a new reel: the link details. For an existing reel: the reel.
  initial: Partial<Reel> & Pick<Reel, "url" | "link_key" | "platform">;
  isNew: boolean;
  collections: string[];
  businesses: BizOption[];
  locations: LocOption[];
  onBusinessCreated: (b: BizOption) => void;
  initialDeals: Deal[];
  initialOffers: Offer[];
  canDelete: boolean;
  onSave: (values: ReelInput, extras: Extras) => Promise<string | null>; // returns a problem message, or null when saved
  onDelete?: () => Promise<void>;
  onCancel: () => void;
};

export default function ReelForm({ initial, isNew, collections, businesses, locations, onBusinessCreated, initialDeals, initialOffers, canDelete, onSave, onDelete, onCancel }: Props) {
  const [v, setV] = useState({
    place_name: initial.place_name ?? "",
    branch: initial.branch ?? "",
    emirate: initial.emirate ?? "",
    country: initial.country ?? "UAE",
    category: initial.category ?? "",
    collection: initial.collection ?? "",
    maps_url: initial.maps_url ?? "",
    lat: initial.lat != null ? String(initial.lat) : "",
    lng: initial.lng != null ? String(initial.lng) : "",
    creator_handle: initial.creator_handle ?? "",
    offer_text: initial.offer_text ?? "",
    offer_start: initial.offer_start ?? "",
    offer_end: initial.offer_end ?? "",
    offer_hours: initial.offer_hours ?? "",
    notes: initial.notes ?? "",
    business_id: initial.business_id ?? "",
    location_id: initial.location_id ?? "",
    posted_on: initial.posted_on ?? "",
    status: (initial.status ?? "to_check") as ReelStatus,
  });
  const [dishes, setDishes] = useState<{ name: string; price: string }[]>(
    (initial.dishes ?? []).map((d) => ({ name: d.name, price: String(d.price_aed) })),
  );
  const [dealsOpen, setDealsOpen] = useState(initialDeals.length + initialOffers.length > 0);
  const [dealDrafts, setDealDrafts] = useState<DealDraft[]>(initialDeals.map(draftFromDeal));
  const [offerDrafts, setOfferDrafts] = useState<OfferDraft[]>(initialOffers.map(draftFromOffer));
  const [mapsPaste, setMapsPaste] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { supabase } = useAdmin();
  const [bizFilter, setBizFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", type: "restaurant" as "restaurant" | "shop" });
  const [bizMessage, setBizMessage] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    setMessage("");
  };

  const cannotPin = pinProblem({ place_name: v.place_name, lat: num(v.lat), lng: num(v.lng) });

  function readPin() {
    const r = readMapsPin(mapsPaste);
    if (!r.ok) return setPinMessage(r.reason);
    setV((o) => ({ ...o, lat: String(r.lat), lng: String(r.lng), maps_url: mapsPaste.trim() }));
    setPinMessage(`Pin found: ${r.lat}, ${r.lng}`);
  }

  // choosing a restaurant or shop: fill the place name if it is empty, and drop a location that does not belong to it
  function pickBusiness(id: string) {
    const b = businesses.find((x) => x.id === id);
    setV((o) => {
      const loc = locations.find((l) => l.id === o.location_id);
      return {
        ...o,
        business_id: id,
        place_name: o.place_name.trim() || !b ? o.place_name : b.name,
        location_id: locationFits(loc, id) ? o.location_id : "",
      };
    });
    setMessage("");
  }

  // choosing a location: copy its pin and emirate into the empty fields, and pick its restaurant or shop if none is chosen
  function pickLocation(id: string) {
    const l = locations.find((x) => x.id === id);
    setV((o) => ({
      ...o,
      location_id: id,
      business_id: o.business_id || l?.business_id || "",
      emirate: o.emirate || l?.emirate || "",
      maps_url: o.maps_url || l?.maps_url || "",
      lat: o.lat || (l?.lat != null ? String(l.lat) : ""),
      lng: o.lng || (l?.lng != null ? String(l.lng) : ""),
    }));
    setMessage("");
  }

  async function createBusiness() {
    if (!supabase) return;
    if (!newBiz.name.trim()) return setBizMessage("Type the name.");
    const { data, error } = await supabase.from("businesses").insert({ name: newBiz.name.trim(), type: newBiz.type }).select("id, name, type, code").single();
    if (error || !data) return setBizMessage(error?.message ?? "It did not save.");
    onBusinessCreated(data as BizOption);
    pickBusiness((data as BizOption).id);
    setCreating(false);
    setNewBiz({ name: "", type: "restaurant" });
    setBizMessage(`Created ${(data as BizOption).name}. Its code is ${(data as BizOption).code}. Add Instagram, email and WhatsApp later from the Pin Desk home.`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { dishes: clean, problem } = cleanDishes(dishes);
    if (problem) return setMessage(problem);
    const lat = num(v.lat);
    const lng = num(v.lng);
    if ((v.lat.trim() && lat == null) || (v.lng.trim() && lng == null)) return setMessage("The pin must be numbers.");
    if ((lat != null && Math.abs(lat) > 90) || (lng != null && Math.abs(lng) > 180)) return setMessage("That pin is not on the map.");
    if (v.status === "pinned" && cannotPin) return setMessage(`Cannot mark Pinned. ${cannotPin}`);
    const dealResult = cleanDeals(dealDrafts);
    if (dealResult.problem) return setMessage(dealResult.problem);
    const offerResult = cleanOffers(offerDrafts);
    if (offerResult.problem) return setMessage(offerResult.problem);
    const postedProblem = postedOnProblem({ dishCount: clean.length, dealCount: dealResult.deals.length + offerResult.offers.length, postedOn: v.posted_on });
    if (postedProblem) return setMessage(postedProblem);
    if (!locationFits(locations.find((l) => l.id === v.location_id), v.business_id)) return setMessage("That location belongs to a different restaurant or shop.");
    if (v.maps_url.trim() && !/^https:\/\//i.test(v.maps_url.trim())) return setMessage("The Google Maps link must start with https://");
    setBusy(true);
    const t = (s: string) => (s.trim() === "" ? null : s.trim());
    const problemFromDb = await onSave({
      url: initial.url,
      link_key: initial.link_key,
      platform: initial.platform,
      place_name: t(v.place_name),
      branch: t(v.branch),
      emirate: t(v.emirate),
      country: t(v.country) ?? "UAE",
      category: (t(v.category) as ReelInput["category"]) ?? null,
      collection: t(v.collection),
      maps_url: t(v.maps_url),
      lat,
      lng,
      creator_handle: t(v.creator_handle),
      dishes: clean,
      offer_text: t(v.offer_text),
      offer_start: t(v.offer_start),
      offer_end: t(v.offer_end),
      offer_hours: t(v.offer_hours),
      notes: t(v.notes),
      business_id: v.business_id || null,
      location_id: v.location_id || null,
      posted_on: v.posted_on || null,
      status: v.status,
    }, {
      deals: dealResult.deals,
      offers: offerResult.offers,
      removedDealIds: initialDeals.map((d) => d.id!).filter((id) => !dealResult.deals.some((d) => d.id === id)),
      removedOfferIds: initialOffers.map((o) => o.id!).filter((id) => !offerResult.offers.some((o) => o.id === id)),
    });
    setBusy(false);
    if (problemFromDb) setMessage(problemFromDb);
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-4 rounded-3xl bg-box p-5 text-onpanel">
      <div>
        <p className="text-sm font-bold text-mist">{initial.platform}</p>
        <a href={initial.url} target="_blank" rel="noopener noreferrer" className="break-all font-extrabold underline">
          {initial.url}
        </a>
        {!isNew && (
          <p className="mt-1 text-sm text-mist">
            Reel code {initial.code ?? "-"} · Added by {initial.added_by ?? "-"}
            {initial.status === "pinned" || initial.pinned_by ? ` · Pinned by ${initial.pinned_by ?? "-"}` : ""}
          </p>
        )}
      </div>

      {/* links: a restaurant or shop, a location, or both */}
      <fieldset className="grid gap-3 rounded-2xl bg-alt p-4 text-onpage">
        <legend className="font-extrabold">Restaurant or shop, and location</legend>
        <p className="text-sm font-bold">A reel can link to a restaurant or shop, to a location, or to both.</p>
        <div>
          <label className={label} htmlFor="rf-biz">Restaurant or shop</label>
          <input aria-label="Find a restaurant or shop" placeholder="Type to find one" className={`${field} mb-2`} value={bizFilter} onChange={(e) => setBizFilter(e.target.value)} autoComplete="off" />
          <select id="rf-biz" className={field} value={v.business_id} onChange={(e) => pickBusiness(e.target.value)}>
            <option value="">None</option>
            {businesses
              .filter((b) => !bizFilter.trim() || b.name.toLowerCase().includes(bizFilter.trim().toLowerCase()) || b.id === v.business_id)
              .map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.type === "shop" ? "Shop" : "Restaurant"})</option>
              ))}
          </select>
          <button type="button" onClick={() => setCreating(!creating)} className="mt-2 min-h-11 rounded-full border-2 border-line px-5 font-extrabold">
            {creating ? "Close" : "Create a new restaurant or shop"}
          </button>
          {bizMessage && <p role="status" className="mt-2 text-sm font-bold">{bizMessage}</p>}
        </div>
        {creating && (
          <div className="grid gap-2 rounded-xl bg-paper p-3 text-charcoal">
            <label className={label} htmlFor="rf-newbiz">New name</label>
            <input id="rf-newbiz" className={field} value={newBiz.name} onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })} autoComplete="off" />
            {similarNames(newBiz.name, businesses).length > 0 && (
              <p role="status" className="text-sm font-bold">
                Already saved with a similar name: {similarNames(newBiz.name, businesses).map((b) => b.name).join(", ")}. Pick it from the list above if it is the same place.
              </p>
            )}
            <select aria-label="Type" className={field} value={newBiz.type} onChange={(e) => setNewBiz({ ...newBiz, type: e.target.value as "restaurant" | "shop" })}>
              <option value="restaurant">Restaurant (food or drink)</option>
              <option value="shop">Shop (not food)</option>
            </select>
            <button type="button" onClick={createBusiness} className="min-h-11 rounded-full bg-accent px-5 font-extrabold text-onaccent">Create</button>
          </div>
        )}
        <div>
          <label className={label} htmlFor="rf-loc">Location</label>
          <select id="rf-loc" className={field} value={v.location_id} onChange={(e) => pickLocation(e.target.value)}>
            <option value="">None</option>
            {locationGroups(v.business_id, locations).map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.items.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.is_building ? " (mall or hotel)" : ""}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <a href="/admin/add-location" target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 w-fit items-center rounded-full border-2 border-line px-5 font-extrabold">Add a new location</a>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="rf-place">Place name</label>
          <input id="rf-place" className={field} value={v.place_name} onChange={set("place_name")} />
        </div>
        <div>
          <label className={label} htmlFor="rf-branch">Branch</label>
          <input id="rf-branch" className={field} value={v.branch} onChange={set("branch")} />
        </div>
        <div>
          <label className={label} htmlFor="rf-emirate">Emirate</label>
          <select id="rf-emirate" className={field} value={v.emirate} onChange={set("emirate")}>
            <option value="">Choose...</option>
            {EMIRATES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="rf-country">Country</label>
          <input id="rf-country" className={field} value={v.country} onChange={set("country")} />
        </div>
        <div>
          <label className={label} htmlFor="rf-category">Category</label>
          <select id="rf-category" className={field} value={v.category} onChange={set("category")}>
            <option value="">Choose...</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="rf-collection">Collection</label>
          <input id="rf-collection" list="rf-collections" className={field} value={v.collection} onChange={set("collection")} />
          <datalist id="rf-collections">
            {collections.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Google Maps */}
      <div className="rounded-2xl bg-alt p-4 text-onpage">
        <p className="font-extrabold">Pin on the map</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {v.place_name.trim() ? (
            <a
              href={mapsSearchUrl(v.place_name, v.branch, v.emirate)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center rounded-full bg-accent px-5 font-extrabold text-onaccent"
            >
              Find on Google Maps
            </a>
          ) : (
            <span className="text-sm font-bold">Add the place name to search on Google Maps.</span>
          )}
        </div>
        <label className={`${label} mt-3`} htmlFor="rf-mapspaste">Paste the full Google Maps link here</label>
        <div className="flex gap-2">
          <input id="rf-mapspaste" className={field} value={mapsPaste} onChange={(e) => setMapsPaste(e.target.value)} placeholder="https://www.google.com/maps/..." />
          <button type="button" onClick={readPin} className="min-h-11 shrink-0 rounded-full border-2 border-line px-5 font-extrabold">
            Read pin
          </button>
        </div>
        {pinMessage && <p role="status" className="mt-2 text-sm font-bold">{pinMessage}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="rf-lat">Latitude</label>
            <input id="rf-lat" inputMode="decimal" className={field} value={v.lat} onChange={set("lat")} />
          </div>
          <div>
            <label className={label} htmlFor="rf-lng">Longitude</label>
            <input id="rf-lng" inputMode="decimal" className={field} value={v.lng} onChange={set("lng")} />
          </div>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="rf-creator">Creator (team only, never shown to app users or the public)</label>
        <input id="rf-creator" className={field} value={v.creator_handle} onChange={set("creator_handle")} placeholder="@handle" />
      </div>

      {/* dishes */}
      <fieldset className="grid gap-2">
        <legend className={label}>Items seen in the reel (up to {MAX_DISHES}, name and price in AED). Not a full menu.</legend>
        {dishes.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={`Item ${i + 1} name`} placeholder="Item name" className={field} value={d.name} onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label={`Item ${i + 1} price in AED`} placeholder="AED" inputMode="decimal" className={`${field} max-w-28`} value={d.price} onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => setDishes(dishes.filter((_, j) => j !== i))} className="min-h-11 shrink-0 rounded-full border-2 border-line px-4 font-extrabold">
              X
            </button>
          </div>
        ))}
        {dishes.length < MAX_DISHES && (
          <button type="button" onClick={() => setDishes([...dishes, { name: "", price: "" }])} className="min-h-11 w-fit rounded-full border-2 border-line px-5 font-extrabold">
            Add an item
          </button>
        )}
      </fieldset>

      {/* a deal or an offer: several are allowed */}
      <ReelExtras open={dealsOpen} setOpen={setDealsOpen} deals={dealDrafts} setDeals={setDealDrafts} offers={offerDrafts} setOffers={setOfferDrafts} />

      <div>
        <label className={label} htmlFor="rf-posted">Posted on (needed when the reel has items, a deal or an offer)</label>
        <input id="rf-posted" type="date" className={field} value={v.posted_on} onChange={set("posted_on")} />
      </div>

      <div>
        <label className={label} htmlFor="rf-notes">Notes</label>
        <textarea id="rf-notes" rows={3} className={`${field} py-2`} value={v.notes} onChange={set("notes")} />
      </div>

      <div>
        <label className={label} htmlFor="rf-status">Status</label>
        <select id="rf-status" className={field} value={v.status} onChange={set("status")}>
          {(["to_check", "pinned", "skip"] as ReelStatus[]).map((s) => (
            <option key={s} value={s} disabled={s === "pinned" && !!cannotPin}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {cannotPin && <p className="mt-1 text-sm text-mist">Pinned needs a place name and a pin. {cannotPin}</p>}
      </div>

      {message && (
        <p role="alert" className="rounded-xl bg-alt p-3 font-bold text-onpage">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="min-h-12 rounded-full bg-accent px-7 font-extrabold text-onaccent disabled:opacity-60">
          {busy ? "Saving..." : isNew ? "Add reel" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-12 rounded-full border-2 border-line px-7 font-extrabold">
          Cancel
        </button>
        {!isNew && canDelete && onDelete && (
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Delete this reel from the desk?")) await onDelete();
            }}
            className="ml-auto min-h-12 rounded-full border-2 border-line px-7 font-extrabold"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
