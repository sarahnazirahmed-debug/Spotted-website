"use client";

// /admin/add-location: add a place on the map. The code is made by the database on Save, never typed.
// A mall or a hotel can list the places inside it (one per line, up to 500).
import Link from "next/link";
import { useEffect, useState } from "react";
import { EMIRATES } from "@/lib/pinRules";
import { mapsSearchUrl, readMapsPin } from "@/lib/mapsLink";
import { locationProblem, mapsUrlToSave, MAX_BUILDING_PLACES, parsePlaces } from "@/lib/locationRules";
import { useAdmin } from "./AdminProvider";

type Biz = { id: string; name: string; type: "restaurant" | "shop" };

const field = "min-h-11 w-full rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";
const button = "flex min-h-12 items-center justify-center rounded-full px-6 text-lg font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-heading";
const empty = { name: "", emirate: "", paste: "", businessId: "", building: false, placesText: "" };

export default function AddLocation() {
  const { supabase } = useAdmin();
  const [v, setV] = useState(empty);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinMessage, setPinMessage] = useState("");
  const [bizFilter, setBizFilter] = useState("");
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ code: string; name: string; placesSaved: number; warning: string } | null>(null);
  const set = <K extends keyof typeof empty>(k: K, value: (typeof empty)[K]) => setV((o) => ({ ...o, [k]: value }));

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase) return;
      const { data } = await supabase.from("businesses").select("id, name, type").order("name").limit(10000);
      if (!dead) setBusinesses((data as Biz[]) ?? []);
    })();
    return () => {
      dead = true;
    };
  }, [supabase]);

  const shownBusinesses = businesses.filter((b) => !bizFilter.trim() || b.name.toLowerCase().includes(bizFilter.trim().toLowerCase()) || b.id === v.businessId);
  const places = v.building ? parsePlaces(v.placesText) : null;

  function readPin(): { lat: number; lng: number } | null {
    const r = readMapsPin(v.paste);
    if (!r.ok) {
      setPin(null);
      setPinMessage(r.reason);
      return null;
    }
    setPin({ lat: r.lat, lng: r.lng });
    setPinMessage(`Pin found: ${r.lat}, ${r.lng}`);
    return { lat: r.lat, lng: r.lng };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = locationProblem(v);
    setProblem(p ?? "");
    if (p || !supabase) return;
    // a link was pasted but "Read the pin" was not pressed: read it now
    let found = pin;
    if (v.paste.trim() && !found) {
      found = readPin();
      if (!found) return setProblem("The link has no pin I can read. Fix the link, or clear the box to save without a pin.");
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("locations")
      .insert({
        name: v.name.trim(),
        maps_url: v.paste.trim() ? mapsUrlToSave(v.paste) : null,
        lat: found?.lat ?? null,
        lng: found?.lng ?? null,
        emirate: v.emirate || null,
        is_building: v.building,
        business_id: v.businessId || null,
      })
      .select("id, code, name")
      .single();
    if (error || !data) {
      setBusy(false);
      return setProblem(error?.message ?? "It did not save. Please try again.");
    }
    // the places inside, saved in small groups
    let placesSaved = 0;
    let warning = "";
    const list = places?.places ?? [];
    for (let i = 0; i < list.length; i += 100) {
      const rows = list.slice(i, i + 100).map((name) => ({ location_id: data.id, name }));
      const r = await supabase.from("building_places").insert(rows);
      if (r.error) {
        warning = `The location is saved, but only ${placesSaved} of ${list.length} places were. ${r.error.message}`;
        break;
      }
      placesSaved += rows.length;
    }
    setBusy(false);
    setSaved({ code: data.code, name: data.name, placesSaved, warning });
  }

  if (saved)
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        <h1 className="text-4xl font-extrabold text-heading">Saved</h1>
        <p className="text-xl font-bold">{saved.name}</p>
        {saved.placesSaved > 0 && <p className="font-bold">{saved.placesSaved} places inside saved.</p>}
        {saved.warning && <p role="alert" className="font-bold text-heading">{saved.warning}</p>}
        <div className="rounded-3xl bg-panel p-6">
          <p className="text-sm font-bold text-ash">Code (for the team only)</p>
          <p className="mt-1 break-all text-3xl font-extrabold tracking-widest text-heading" aria-label="Code">{saved.code}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className={`${button} bg-accent text-onaccent`} onClick={() => { setSaved(null); setV(empty); setPin(null); setPinMessage(""); setProblem(""); }}>
            Add another
          </button>
          <Link href="/admin" className={`${button} border-2 border-line text-heading hover:bg-alt`}>Back to the Pin Desk</Link>
        </div>
      </div>
    );

  return (
    <form onSubmit={save} className="mx-auto grid max-w-2xl gap-5" noValidate>
      <h1 className="text-4xl font-extrabold text-heading">Add location</h1>

      <div>
        <label htmlFor="l-name" className={label}>Name</label>
        <input id="l-name" className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={160} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="l-emirate" className={label}>Emirate</label>
        <select id="l-emirate" className={field} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
          <option value="">Choose later</option>
          {EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="grid gap-3 rounded-2xl bg-alt p-4">
        {v.name.trim() ? (
          <a href={mapsSearchUrl(v.name, "", v.emirate)} target="_blank" rel="noopener noreferrer" className={`${button} bg-accent text-onaccent`}>
            Find on Google Maps
          </a>
        ) : (
          <p className="text-sm font-bold">Type the name to search on Google Maps.</p>
        )}
        <div>
          <label htmlFor="l-paste" className={label}>Paste the Google Maps link here</label>
          <input id="l-paste" className={field} value={v.paste} onChange={(e) => { set("paste", e.target.value); setPin(null); setPinMessage(""); }} autoCapitalize="none" autoComplete="off" />
        </div>
        <button type="button" onClick={readPin} className="flex min-h-11 items-center justify-center rounded-full border-2 border-line px-5 font-extrabold text-heading hover:bg-panel">
          Read the pin
        </button>
        {pinMessage && <p role="status" className="text-sm font-bold">{pinMessage}</p>}
      </div>

      <div>
        <label htmlFor="l-bizfilter" className={label}>Linked restaurant or shop (optional)</label>
        <input id="l-bizfilter" className={`${field} mb-2`} placeholder="Type to find one" value={bizFilter} onChange={(e) => setBizFilter(e.target.value)} autoComplete="off" />
        <select aria-label="Restaurant or shop" className={field} value={v.businessId} onChange={(e) => set("businessId", e.target.value)}>
          <option value="">None</option>
          {shownBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.type === "shop" ? "Shop" : "Restaurant"})</option>)}
        </select>
      </div>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line p-3 font-extrabold text-heading">
        <input type="checkbox" role="switch" className="size-6 accent-current" checked={v.building} onChange={(e) => set("building", e.target.checked)} />
        A building with many places inside (mall, hotel)
      </label>

      {v.building && (
        <div>
          <label htmlFor="l-places" className={label}>Places inside: paste them, one per line (up to {MAX_BUILDING_PLACES})</label>
          <textarea id="l-places" rows={8} className={`${field} py-2`} value={v.placesText} onChange={(e) => set("placesText", e.target.value)} />
          <p className="mt-1 text-sm font-bold text-ash">
            {places && places.places.length} places{places && places.repeats > 0 ? `, ${places.repeats} repeated line${places.repeats > 1 ? "s" : ""} left out` : ""}
          </p>
        </div>
      )}

      {problem && <p role="alert" className="font-bold text-heading">{problem}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="submit" disabled={busy} className={`${button} bg-accent text-onaccent disabled:opacity-60`}>{busy ? "Saving" : "Save"}</button>
        <Link href="/admin" className={`${button} border-2 border-line text-heading hover:bg-alt`}>Cancel</Link>
      </div>
    </form>
  );
}
