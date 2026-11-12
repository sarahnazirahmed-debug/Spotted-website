"use client";

// /admin/pin: the Pin Desk. Everyone on the team can use it.
// Add a reel by pasting its link, fill in the place facts, and Pin it once it has a place and a pin.
// We only store links and place facts. Never videos, photos, captions, or anything about app users.
import { LoadingBlocks } from "@/components/Skeleton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canDeleteReels, canPinReels } from "@/lib/teamRules";
import { EMIRATES, pinProblem, STATUS_LABEL, type ReelStatus } from "@/lib/pinRules";
import { readReelLink } from "@/lib/reelLinks";
import { reelsToRows, rowsToReels } from "@/lib/reelExcel";
import type { Reel, ReelInput, ShareRequest } from "@/lib/reelTypes";
import { useAdmin } from "./AdminProvider";
import DuplicateNotice from "./DuplicateNotice";
import ReelDetails from "./ReelDetails";
import type { Deal, Offer } from "@/lib/reelDeals";
import ReelForm from "./ReelForm";
import { saveReelExtras, type Extras } from "@/lib/reelExtrasSave";
import type { BizOption, LocOption } from "@/lib/reelPlace";

type Tab = "all" | ReelStatus | "waiting";
const field = "min-h-11 rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const small = "min-h-11 rounded-full border-2 border-line px-4 font-extrabold";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function PinDesk() {
  const { supabase, me } = useAdmin();
  const [reels, setReels] = useState<Reel[]>([]);
  const [waiting, setWaiting] = useState<ShareRequest[]>([]);
  const [businesses, setBusinesses] = useState<BizOption[]>([]);
  const [locations, setLocations] = useState<LocOption[]>([]);
  const [deals, setDeals] = useState<(Deal & { reel_id: string })[]>([]);
  const [offers, setOffers] = useState<(Offer & { reel_id: string })[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [emirate, setEmirate] = useState("");
  // the home page's "Add reel" bar opens this page with ?add=1, so the add form is already open
  const [adding, setAdding] = useState(() => new URLSearchParams(window.location.search).get("add") === "1");
  const [linkText, setLinkText] = useState("");
  const [editing, setEditing] = useState<Reel | null>(null);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // fetchAll only asks the database; apply puts the answer on the page.
  const fetchAll = useCallback(async () => {
    if (!supabase) return null;
    const [r, w, b, l, dl, of] = await Promise.all([
      supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(5000),
      supabase.from("waiting_requests").select("*").limit(1000),
      supabase.from("businesses").select("id, name, type, code").order("name").limit(10000),
      supabase.from("locations").select("id, name, emirate, maps_url, lat, lng, is_building, business_id").order("name").limit(10000),
      supabase.from("reel_deals").select("id, reel_id, title, included, conditions, end_date, reel_deal_prices(people, total_price_aed)").limit(20000),
      supabase.from("reel_offers").select("*").limit(20000),
    ]);
    type DealRow = Omit<Deal, "prices"> & { reel_id: string; reel_deal_prices: Deal["prices"] };
    return {
      deals: ((dl.data as DealRow[] | null) ?? []).map(({ reel_deal_prices, ...d }) => ({ ...d, prices: reel_deal_prices ?? [] })),
      offers: (of.data as (Offer & { reel_id: string })[] | null) ?? [],
      reels: (r.data as Reel[]) ?? [],
      waiting: (w.data as ShareRequest[]) ?? [],
      businesses: (b.data as BizOption[]) ?? [],
      locations: (l.data as LocOption[]) ?? [],
    };
  }, [supabase]);
  const apply = (d: { reels: Reel[]; waiting: ShareRequest[]; businesses: BizOption[]; locations: LocOption[]; deals: (Deal & { reel_id: string })[]; offers: (Offer & { reel_id: string })[] } | null) => {
    if (!d) return;
    setDeals(d.deals);
    setOffers(d.offers);
    setBusinesses(d.businesses);
    setLocations(d.locations);
    setReels(d.reels);
    setWaiting(d.waiting);
    setLoaded(true);
  };
  const load = async () => apply(await fetchAll());

  useEffect(() => {
    let dead = false;
    void fetchAll().then((d) => {
      if (!dead) apply(d);
    });
    return () => {
      dead = true;
    };
  }, [fetchAll]);

  const counts = useMemo(
    () => ({
      all: reels.length,
      to_check: reels.filter((r) => r.status === "to_check").length,
      pinned: reels.filter((r) => r.status === "pinned").length,
      skip: reels.filter((r) => r.status === "skip").length,
      waiting: waiting.length,
    }),
    [reels, waiting],
  );
  const collections = useMemo(() => [...new Set(reels.map((r) => r.collection).filter((c): c is string => !!c))].sort(), [reels]);
  const emirates = useMemo(() => [...new Set([...EMIRATES, ...reels.map((r) => r.emirate).filter((e): e is string => !!e)])], [reels]);

  const bizNames = useMemo(() => new Map(businesses.map((b) => [b.id, b.name])), [businesses]);
  const shown = reels.filter((r) => {
    if (tab !== "all" && tab !== "waiting" && r.status !== tab) return false;
    if (platform && r.platform !== platform) return false;
    if (emirate && r.emirate !== emirate) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [r.place_name, r.branch, r.emirate, r.category, r.collection, r.creator_handle, r.notes, r.link_key, r.offer_text, r.added_by, r.pinned_by]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  const shownWaiting = waiting.filter((w) => (!platform || w.platform === platform) && (!q.trim() || w.link_key.toLowerCase().includes(q.trim().toLowerCase())));

  // ---- adding ----
  const info = linkText.trim() ? readReelLink(linkText) : null;
  // Is this reel already on the desk? Checked in the list we have, and also asked of the database straight away.
  const [remoteDup, setRemoteDup] = useState<{ key: string; reel: Reel } | null>(null);
  const infoKey = info?.ok ? info.linkKey : "";
  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !infoKey) return;
      const { data } = await supabase.from("reels").select("*").eq("link_key", infoKey).limit(1);
      const row = (data as Reel[] | null)?.[0];
      if (!dead) setRemoteDup(row ? { key: infoKey, reel: row } : null);
    })();
    return () => {
      dead = true;
    };
  }, [supabase, infoKey]);
  const duplicate = info?.ok ? (reels.find((r) => r.link_key === info.linkKey) ?? (remoteDup?.key === info.linkKey ? remoteDup.reel : undefined)) : undefined;

  async function addReel(values: ReelInput, extras: Extras): Promise<string | null> {
    const { data, error } = await supabase!.from("reels").insert(values).select("id, code").single();
    if (error) return error.code === "23505" ? "This reel already exists." : `The database did not allow that (${error.message}).`;
    const problem = await saveExtras((data as { id: string }).id, extras);
    setAdding(false);
    setLinkText("");
    setNotice(`Reel added. Reel code: ${(data as { code: string }).code}${problem ? ` (${problem})` : ""}`);
    await load();
    return null;
  }

  const saveExtras = (reelId: string, extras: Extras) => saveReelExtras(supabase!, reelId, extras, deals);

  async function saveReel(values: ReelInput, extras: Extras): Promise<string | null> {
    if (!editing) return null;
    // the link itself never changes; only the facts do
    const { url: _url, link_key: _key, platform: _platform, ...facts } = values;
    void _url; void _key; void _platform;
    const { error } = await supabase!.from("reels").update(facts).eq("id", editing.id);
    if (error) return `The database did not allow that (${error.message}).`;
    const problem = await saveExtras(editing.id, extras);
    setEditing(null);
    setNotice(problem ? `Saved, but ${problem}` : "Saved.");
    await load();
    return null;
  }

  async function setStatus(r: Reel, status: ReelStatus) {
    if (status === "pinned") {
      const why = pinProblem(r);
      if (why) return setNotice(`Cannot mark Pinned. ${why} Open Edit to add it.`);
    }
    const { error } = await supabase!.from("reels").update({ status }).eq("id", r.id);
    setNotice(error ? `The database did not allow that (${error.message}).` : `Marked ${STATUS_LABEL[status]}.`);
    await load();
  }

  // ---- Excel ----
  async function download() {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    await writeExcelFile(reelsToRows(reels)).toFile(`pin-desk-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function importFile(file: File) {
    setNotice("Reading the file...");
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const rows = (await readSheet(file)) as unknown[][];
      const { items, problems } = rowsToReels(rows);
      const have = new Set(reels.map((r) => r.link_key));
      const fresh = items.filter((i) => !have.has(i.link_key));
      const skipped = items.length - fresh.length;
      let added = 0;
      for (let i = 0; i < fresh.length; i += 100) {
        const batch = fresh.slice(i, i + 100);
        const { error } = await supabase!.from("reels").insert(batch);
        if (!error) {
          added += batch.length;
          continue;
        }
        for (const one of batch) {
          const r = await supabase!.from("reels").insert(one);
          if (r.error) problems.push(`${one.link_key}: ${r.error.code === "23505" ? "already on the desk" : r.error.message}`);
          else added++;
        }
      }
      await load();
      setNotice(
        `Imported ${added} reel${added === 1 ? "" : "s"}. Skipped ${skipped} already on the desk.` +
          (problems.length ? ` ${problems.length} notes: ${problems.slice(0, 5).join(" | ")}${problems.length > 5 ? " ..." : ""}` : ""),
      );
    } catch {
      setNotice("Could not read that file. Please use an .xlsx file with a Link column.");
    }
  }

  const tabButton = (t: Tab, text: string) => (
    <button
      key={t}
      type="button"
      aria-pressed={tab === t}
      onClick={() => setTab(t)}
      className={`min-h-11 rounded-full px-4 font-extrabold ${tab === t ? "bg-accent text-onaccent" : "border-2 border-line text-heading"}`}
    >
      {text} <span className="opacity-80">{counts[t]}</span>
    </button>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-extrabold text-heading">Pin Desk</h1>
        <button type="button" onClick={() => { setAdding((a) => !a); setEditing(null); }} className="min-h-11 rounded-full bg-accent px-6 font-extrabold text-onaccent">
          {adding ? "Close" : "Add reel"}
        </button>
        <button type="button" onClick={download} className={small}>Download Excel</button>
        <button type="button" onClick={() => fileInput.current?.click()} className={small}>Import Excel</button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          className="hidden"
          aria-label="Import Excel file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {notice && (
        <p role="status" className="rounded-xl bg-alt p-3 font-bold">
          {notice}
        </p>
      )}

      {/* counts */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {tabButton("all", "All")}
        {tabButton("to_check", "To check")}
        {tabButton("pinned", "Pinned")}
        {tabButton("skip", "Skip")}
        {tabButton("waiting", "Waiting")}
      </div>

      {/* search and filters */}
      <div className="flex flex-wrap gap-3">
        <input type="search" aria-label="Search the desk" placeholder="Search" className={`${field} min-w-56 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Platform" className={field} value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
        </select>
        <select aria-label="Emirate" className={field} value={emirate} onChange={(e) => setEmirate(e.target.value)}>
          <option value="">All emirates</option>
          {emirates.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* checklist */}
      <details className="rounded-2xl bg-alt p-4">
        <summary className="min-h-11 cursor-pointer font-extrabold">Checklist: add or skip?</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-extrabold">Add it when</p>
            <ul className="mt-1 list-disc pl-5">
              <li>It is a real place you can visit (restaurant, cafe, shop, activity).</li>
              <li>You can find it on Google Maps and see the pin.</li>
              <li>The reel shows or names the place or the dish.</li>
              <li>It is in the UAE.</li>
            </ul>
          </div>
          <div>
            <p className="font-extrabold">Skip it when</p>
            <ul className="mt-1 list-disc pl-5">
              <li>There is no real place (a home recipe, a joke, an ad).</li>
              <li>You cannot tell which place it is.</li>
              <li>The place has closed or moved.</li>
              <li>It is only a giveaway or an event that has ended.</li>
            </ul>
          </div>
        </div>
      </details>

      {/* add a reel */}
      {adding && (
        <section className="grid gap-4">
          <h2 className="text-2xl font-extrabold text-heading">Add reel</h2>
          <div>
            <label htmlFor="pd-link" className="mb-1 block text-sm font-bold">Paste the reel link (Instagram, TikTok or YouTube)</label>
            <input id="pd-link" className={`${field} w-full`} value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="https://www.instagram.com/reel/..." autoFocus />
          </div>
          {info && !info.ok && <p role="alert" className="font-bold">{info.reason}</p>}
          {info?.ok && (
            <p className="text-sm font-bold">
              {info.platform} · {info.linkKey}
              {info.creator ? ` · ${info.creator}` : ""}
            </p>
          )}
          {duplicate && (
            <DuplicateNotice
              reel={duplicate}
              businessName={businesses.find((b) => b.id === duplicate.business_id)?.name ?? null}
              onOpen={() => { setAdding(false); setEditing(duplicate); setLinkText(""); }}
              onDifferent={() => setLinkText("")}
            />
          )}
          {info?.ok && !duplicate && (
            <ReelForm
              businesses={businesses}
              locations={locations}
              onBusinessCreated={(b) => setBusinesses((o) => [...o, b].sort((x, y) => x.name.localeCompare(y.name)))}
              initialDeals={[]}
              initialOffers={[]}
              key={info.linkKey}
              initial={{ url: info.url, link_key: info.linkKey, platform: info.platform, creator_handle: info.creator ?? null }}
              isNew
              collections={collections}
              canDelete={false}
              onSave={addReel}
              onCancel={() => { setAdding(false); setLinkText(""); }}
            />
          )}
        </section>
      )}

      {/* edit a reel */}
      {editing && (
        <section className="grid gap-4">
          <h2 className="text-2xl font-extrabold text-heading">Edit reel</h2>
          <ReelForm
            businesses={businesses}
            locations={locations}
            onBusinessCreated={(b) => setBusinesses((o) => [...o, b].sort((x, y) => x.name.localeCompare(y.name)))}
            initialDeals={deals.filter((d) => d.reel_id === editing.id)}
            initialOffers={offers.filter((o) => o.reel_id === editing.id)}
            key={editing.id}
            initial={editing}
            isNew={false}
            collections={collections}
            canDelete={canDeleteReels(me?.role ?? null)}
            onSave={saveReel}
            onDelete={async () => {
              const { error } = await supabase!.from("reels").delete().eq("id", editing.id);
              setNotice(error ? "The database did not allow that." : "Deleted.");
              setEditing(null);
              await load();
            }}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}

      {/* the list */}
      {tab === "waiting" ? (
        <section className="grid gap-3">
          <p className="text-sm">Shared by app users and not pinned yet. Most shared first.</p>
          {shownWaiting.map((w) => (
            <div key={w.link_key} className="flex flex-wrap items-center gap-3 rounded-2xl bg-box p-4 text-onpanel">
              <div className="min-w-0 flex-1">
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="break-all font-extrabold underline">{w.url}</a>
                <p className="text-sm text-mist">
                  {w.platform} · shared {w.times_shared} {w.times_shared === 1 ? "time" : "times"} · first {day(w.first_shared_at)} · last {day(w.last_shared_at)}
                </p>
              </div>
              <button type="button" className={small} onClick={() => { setAdding(true); setEditing(null); setLinkText(w.url); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                Add to the desk
              </button>
            </div>
          ))}
          {loaded && shownWaiting.length === 0 && <p className="rounded-2xl bg-alt p-6 text-center font-bold">Nothing is waiting.</p>}
        </section>
      ) : (
        <section className="grid gap-3">
          {shown.map((r) => (
            <article key={r.id} className="rounded-2xl bg-box p-4 text-onpanel">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-mist">
                    {r.platform} · {STATUS_LABEL[r.status]}
                    {r.category ? ` · ${r.category}` : ""}
                    {r.collection ? ` · ${r.collection}` : ""}
                  </p>
                  <h3 className="text-xl font-extrabold">
                    {r.place_name || "(no place name yet)"}
                    {r.branch ? `, ${r.branch}` : ""}
                  </h3>
                  <p className="text-sm">{[r.emirate, r.country].filter(Boolean).join(", ")}</p>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">{r.url}</a>
                  <p className="mt-1 text-sm text-mist">
                    Added by {r.added_by ?? "-"} · {day(r.created_at)}
                    {r.status === "pinned" ? ` · Pinned by ${r.pinned_by ?? "-"}` : ""}
                    {r.creator_handle ? ` · ${r.creator_handle}` : ""}
                  </p>
                  <ReelDetails businessNames={bizNames} postedOn={r.posted_on} dishes={r.dishes ?? []} deals={deals.filter((d) => d.reel_id === r.id)} offers={offers.filter((o) => o.reel_id === r.id)} />
                  {r.lat == null && <p className="text-sm font-bold">No pin yet.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={small} onClick={() => { setEditing(r); setAdding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  {r.status !== "pinned" && canPinReels(me?.role ?? null) && <button type="button" className={small} onClick={() => setStatus(r, "pinned")}>Pin</button>}
                  {r.status !== "skip" && <button type="button" className={small} onClick={() => setStatus(r, "skip")}>Skip</button>}
                  {r.status !== "to_check" && <button type="button" className={small} onClick={() => setStatus(r, "to_check")}>To check</button>}
                </div>
              </div>
            </article>
          ))}
          {loaded && shown.length === 0 && (
            <p className="rounded-2xl bg-alt p-6 text-center font-bold">{reels.length === 0 ? "The desk is empty. Add the first reel." : "No reels match."}</p>
          )}
          {!loaded && <LoadingBlocks rows={4} />}
        </section>
      )}
    </div>
  );
}
