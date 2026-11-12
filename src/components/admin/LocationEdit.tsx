"use client";

// /admin/locations/edit?id=...: change a location, and for a mall or hotel, its places inside.
import { LoadingBlocks } from "@/components/Skeleton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { canDeleteReels } from "@/lib/teamRules";
import { EMIRATES } from "@/lib/pinRules";
import { mapsSearchUrl, readMapsPin } from "@/lib/mapsLink";
import { MAX_BUILDING_PLACES, mapsUrlToSave, parsePlaces } from "@/lib/locationRules";
import { niceDateTime } from "@/lib/listRules";
import { useAdmin } from "./AdminProvider";
import ChangeHistory from "./ChangeHistory";
import { field, label, outline, primary } from "./ui";

type Row = { id: string; code: string; name: string; maps_url: string | null; lat: number | null; lng: number | null; emirate: string | null; is_building: boolean; business_id: string | null; added_by: string | null; created_at: string };
type Place = { id: string; name: string };
const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export default function LocationEdit() {
  const { supabase, me } = useAdmin();
  const [id] = useState(() => new URLSearchParams(window.location.search).get("id") ?? "");
  const [row, setRow] = useState<Row | null>(null);
  const [missing, setMissing] = useState(false);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [v, setV] = useState({ name: "", emirate: "", maps: "", lat: "", lng: "", businessId: "", building: false, more: "" });
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !id) return;
      const [l, b, p] = await Promise.all([
        supabase.from("locations").select("*").eq("id", id).maybeSingle(),
        supabase.from("businesses").select("id, name").order("name").limit(10000),
        supabase.from("building_places").select("id, name").eq("location_id", id).order("name").limit(1000),
      ]);
      if (dead) return;
      if (!l.data) return setMissing(true);
      const r = l.data as Row;
      setRow(r);
      setBusinesses((b.data as { id: string; name: string }[] | null) ?? []);
      setPlaces((p.data as Place[] | null) ?? []);
      setV({ name: r.name, emirate: r.emirate ?? "", maps: r.maps_url ?? "", lat: r.lat != null ? String(r.lat) : "", lng: r.lng != null ? String(r.lng) : "", businessId: r.business_id ?? "", building: r.is_building, more: "" });
    })();
    return () => {
      dead = true;
    };
  }, [supabase, id, version]);

  if (!id || missing) return <p className="font-bold">That location was not found. <Link href="/admin/locations" className="underline">Back to the list</Link></p>;
  if (!row) return <LoadingBlocks className="mx-auto max-w-2xl" />;

  const set = (k: keyof typeof v, value: string | boolean) => setV((o) => ({ ...o, [k]: value }));
  const parsed = parsePlaces(v.more);

  function readPin() {
    const r = readMapsPin(paste);
    if (!r.ok) return setMessage(r.reason);
    setV((o) => ({ ...o, lat: String(r.lat), lng: String(r.lng), maps: mapsUrlToSave(paste) ?? "" }));
    setMessage(`Pin found: ${r.lat}, ${r.lng}`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return setMessage("Type the name.");
    const lat = num(v.lat);
    const lng = num(v.lng);
    if ((v.lat.trim() && lat == null) || (v.lng.trim() && lng == null)) return setMessage("The pin must be numbers.");
    if (v.building && parsed.problem) return setMessage(parsed.problem);
    const have = new Set(places.map((p) => p.name.toLowerCase()));
    const fresh = v.building ? parsed.places.filter((n) => !have.has(n.toLowerCase())) : [];
    if (places.length + fresh.length > MAX_BUILDING_PLACES) return setMessage(`A building can list at most ${MAX_BUILDING_PLACES} places.`);
    setBusy(true);
    const { error } = await supabase!.from("locations").update({
      name: v.name.trim(), emirate: v.emirate || null, maps_url: v.maps.trim() ? mapsUrlToSave(v.maps) : null, lat, lng, business_id: v.businessId || null, is_building: v.building,
    }).eq("id", row!.id);
    if (error) {
      setBusy(false);
      return setMessage(error.message);
    }
    let note = "Saved.";
    for (let i = 0; i < fresh.length; i += 100) {
      const r = await supabase!.from("building_places").insert(fresh.slice(i, i + 100).map((name) => ({ location_id: row!.id, name })));
      if (r.error) {
        note = `Saved, but not all places were added. ${r.error.message}`;
        break;
      }
    }
    setBusy(false);
    setMessage(note);
    setVersion((n) => n + 1);
  }

  async function removePlace(p: Place) {
    const r = await supabase!.from("building_places").delete().eq("id", p.id).select("id");
    if (r.error || (r.data?.length ?? 0) === 0) return setMessage("Only the main admin and associates can remove a place.");
    setMessage(`Removed ${p.name}.`);
    setVersion((n) => n + 1);
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <form onSubmit={save} noValidate className="grid gap-4">
        <h1 className="text-4xl font-extrabold text-heading">Edit location</h1>
        <div className="rounded-2xl bg-panel p-4">
          <p className="text-sm font-bold text-ash">Code (for the team only, never changes)</p>
          <p className="break-all text-2xl font-extrabold tracking-widest text-heading">{row.code}</p>
          <p className="mt-1 text-sm text-ash">Added by {row.added_by ?? "-"} · {niceDateTime(row.created_at)}</p>
        </div>
        <div>
          <label htmlFor="le-name" className={label}>Name</label>
          <input id="le-name" className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={160} />
        </div>
        <div>
          <label htmlFor="le-em" className={label}>Emirate</label>
          <select id="le-em" className={field} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
            <option value="">Not chosen</option>
            {EMIRATES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="grid gap-3 rounded-2xl bg-alt p-4">
          {v.name.trim() && <a href={mapsSearchUrl(v.name, "", v.emirate)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 w-fit items-center rounded-full bg-accent px-5 font-extrabold text-onaccent">Find on Google Maps</a>}
          <label htmlFor="le-paste" className={label}>Paste a Google Maps link to change the pin</label>
          <div className="flex gap-2">
            <input id="le-paste" className={field} value={paste} onChange={(e) => setPaste(e.target.value)} autoCapitalize="none" />
            <button type="button" onClick={readPin} className="min-h-11 shrink-0 rounded-full border-2 border-line px-5 font-extrabold">Read pin</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="le-lat" className={label}>Latitude</label><input id="le-lat" inputMode="decimal" className={field} value={v.lat} onChange={(e) => set("lat", e.target.value)} /></div>
            <div><label htmlFor="le-lng" className={label}>Longitude</label><input id="le-lng" inputMode="decimal" className={field} value={v.lng} onChange={(e) => set("lng", e.target.value)} /></div>
          </div>
        </div>
        <div>
          <label htmlFor="le-biz" className={label}>Linked restaurant or shop (optional)</label>
          <select id="le-biz" className={field} value={v.businessId} onChange={(e) => set("businessId", e.target.value)}>
            <option value="">None</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line p-3 font-extrabold text-heading">
          <input type="checkbox" role="switch" className="size-6" checked={v.building} onChange={(e) => set("building", e.target.checked)} />
          A building with many places inside (mall, hotel)
        </label>
        {v.building && (
          <div className="grid gap-3">
            <p className="font-bold">{places.length} places inside now (up to {MAX_BUILDING_PLACES}).</p>
            <ul className="grid gap-1">
              {places.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-alt px-3">
                  <span className="break-words">{p.name}</span>
                  {canDeleteReels(me?.role ?? null) && <button type="button" onClick={() => removePlace(p)} aria-label={`Remove ${p.name}`} className="min-h-11 rounded-full border-2 border-line px-4 font-extrabold">Remove</button>}
                </li>
              ))}
            </ul>
            <div>
              <label htmlFor="le-more" className={label}>Add more places, one per line</label>
              <textarea id="le-more" rows={5} className={`${field} py-2`} value={v.more} onChange={(e) => set("more", e.target.value)} />
            </div>
          </div>
        )}
        {message && <p role="status" className="font-bold text-heading">{message}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="submit" disabled={busy} className={primary}>{busy ? "Saving" : "Save"}</button>
          <Link href="/admin/locations" className={outline}>Back to the list</Link>
        </div>
      </form>
      <ChangeHistory rowId={row.id} version={version} />
    </div>
  );
}
