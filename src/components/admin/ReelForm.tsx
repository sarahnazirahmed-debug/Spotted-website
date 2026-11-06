"use client";

// The reel form: used to add a new reel and to edit one. All the fields of the "reels" table.
import { useState } from "react";
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
  canDelete: boolean;
  onSave: (values: ReelInput) => Promise<string | null>; // returns a problem message, or null when saved
  onDelete?: () => Promise<void>;
  onCancel: () => void;
};

export default function ReelForm({ initial, isNew, collections, canDelete, onSave, onDelete, onCancel }: Props) {
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
    status: (initial.status ?? "to_check") as ReelStatus,
  });
  const [dishes, setDishes] = useState<{ name: string; price: string }[]>(
    (initial.dishes ?? []).map((d) => ({ name: d.name, price: String(d.price_aed) })),
  );
  const [mapsPaste, setMapsPaste] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { dishes: clean, problem } = cleanDishes(dishes);
    if (problem) return setMessage(problem);
    const lat = num(v.lat);
    const lng = num(v.lng);
    if ((v.lat.trim() && lat == null) || (v.lng.trim() && lng == null)) return setMessage("The pin must be numbers.");
    if ((lat != null && Math.abs(lat) > 90) || (lng != null && Math.abs(lng) > 180)) return setMessage("That pin is not on the map.");
    if (v.status === "pinned" && cannotPin) return setMessage(`Cannot mark Pinned. ${cannotPin}`);
    if (v.offer_start && v.offer_end && v.offer_end < v.offer_start) return setMessage("The offer ends before it starts.");
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
      status: v.status,
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
            Added by {initial.added_by ?? "-"}
            {initial.status === "pinned" || initial.pinned_by ? ` · Pinned by ${initial.pinned_by ?? "-"}` : ""}
          </p>
        )}
      </div>

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
        <label className={label} htmlFor="rf-creator">Creator (hidden from app users)</label>
        <input id="rf-creator" className={field} value={v.creator_handle} onChange={set("creator_handle")} placeholder="@handle" />
      </div>

      {/* dishes */}
      <fieldset className="grid gap-2">
        <legend className={label}>Dishes (up to {MAX_DISHES}, with the price in AED)</legend>
        {dishes.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={`Dish ${i + 1} name`} placeholder="Dish name" className={field} value={d.name} onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label={`Dish ${i + 1} price in AED`} placeholder="AED" inputMode="decimal" className={`${field} max-w-28`} value={d.price} onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            <button type="button" aria-label={`Remove dish ${i + 1}`} onClick={() => setDishes(dishes.filter((_, j) => j !== i))} className="min-h-11 shrink-0 rounded-full border-2 border-line px-4 font-extrabold">
              X
            </button>
          </div>
        ))}
        {dishes.length < MAX_DISHES && (
          <button type="button" onClick={() => setDishes([...dishes, { name: "", price: "" }])} className="min-h-11 w-fit rounded-full border-2 border-line px-5 font-extrabold">
            Add a dish
          </button>
        )}
      </fieldset>

      {/* offer */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="rf-offer">Offer</label>
          <input id="rf-offer" className={field} value={v.offer_text} onChange={set("offer_text")} />
        </div>
        <div>
          <label className={label} htmlFor="rf-os">Offer starts</label>
          <input id="rf-os" type="date" className={field} value={v.offer_start} onChange={set("offer_start")} />
        </div>
        <div>
          <label className={label} htmlFor="rf-oe">Offer ends</label>
          <input id="rf-oe" type="date" className={field} value={v.offer_end} onChange={set("offer_end")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="rf-oh">Offer hours</label>
          <input id="rf-oh" className={field} value={v.offer_hours} onChange={set("offer_hours")} placeholder="e.g. Mon to Fri, 12 to 4pm" />
        </div>
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
