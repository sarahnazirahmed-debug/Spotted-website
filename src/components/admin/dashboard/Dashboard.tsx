"use client";

// /admin/dashboard. The main admin and associates see everything. Staff see counts only (no money cards).
// Every number: per day, per week or per month; as a graph or a table; for one country or worldwide.
// Which cards to show is remembered in this browser. Numbers that do not exist yet are labelled EXAMPLE.
import { useEffect, useMemo, useState } from "react";
import { canSeeMoney, dashboardAccess, visibleCards } from "@/lib/dashboard/access";
import { GROUP_TITLE, type CardDef, type CardGroup } from "@/lib/dashboard/cards";
import { computeCard, type CardData, type RealRow } from "@/lib/dashboard/compute";
import { cardToTable, sheetNames, summaryRows, type Table } from "@/lib/dashboard/export";
import { EXAMPLE_INFLUENCERS, EXAMPLE_RESTAURANTS } from "@/lib/dashboard/example";
import { GRANULARITIES, GRANULARITY_LABEL, type Granularity } from "@/lib/dashboard/time";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { makePdf, type PdfItem } from "@/lib/pdf";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamRole } from "@/lib/teamRules";
import { useAdmin } from "../AdminProvider";
import CardView, { DataTable, SourceBadge } from "./CardView";

type Prefs = { granularity: Granularity; view: "graph" | "table"; country: string; cards: string[] | null; influencer: string; restaurant: string };
const KEY = "spotted-dashboard";
const DEFAULTS: Prefs = { granularity: "day", view: "graph", country: "ALL", cards: null, influencer: "", restaurant: EXAMPLE_RESTAURANTS[0] };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

type Influencer = { id: string; name: string; handle: string | null; reels: number; visits: number };
const field = "min-h-11 rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const button = "min-h-11 rounded-full border-2 border-line px-5 font-extrabold text-heading";

function download(bytes: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// The page: it only reads who you are, then shows the dashboard for that role.
export default function Dashboard() {
  const { supabase, me } = useAdmin();
  return <DashboardView supabase={supabase} role={me?.role ?? null} name={me?.name ?? ""} />;
}

export function DashboardView({ supabase, role, name }: { supabase: SupabaseClient | null; role: TeamRole | null; name: string }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [real, setReal] = useState<RealRow[] | null>(null);
  const [realInfluencers, setRealInfluencers] = useState<Influencer[] | null>(null);
  const [notice, setNotice] = useState("");

  const allowed = useMemo(() => visibleCards(role), [role]);
  const selected = useMemo(() => {
    const ids = prefs.cards ?? allowed.map((c) => c.id);
    return allowed.filter((c) => ids.includes(c.id));
  }, [prefs.cards, allowed]);

  const update = (patch: Partial<Prefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // not remembered: fine
      }
      return next;
    });

  // the real numbers (they follow the country)
  useEffect(() => {
    let dead = false;
    (async () => {
      if (!supabase || dashboardAccess(role) === "none") return;
      const [r, i] = await Promise.all([
        supabase.rpc("dashboard_real", { p_country: prefs.country, p_days: 400 }),
        supabase.rpc("dashboard_influencers"),
      ]);
      if (dead) return;
      setReal(r.error ? null : (r.data as RealRow[]));
      setRealInfluencers(i.error ? null : (i.data as Influencer[]));
    })();
    return () => {
      dead = true;
    };
  }, [supabase, role, prefs.country]);

  const countries = useMemo(() => COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)), []);

  if (dashboardAccess(role) === "none") return <p className="text-lg">Your role cannot open the dashboard.</p>;

  const ctx = { country: prefs.country, granularity: prefs.granularity, today, real, restaurant: prefs.restaurant };
  const influencersAreReal = !!realInfluencers && realInfluencers.length > 0;
  const influencers: Influencer[] = influencersAreReal ? realInfluencers! : EXAMPLE_INFLUENCERS.map((e) => ({ ...e }));
  const chosen = influencers.find((i) => i.id === prefs.influencer) ?? influencers[0];
  const perReel = (i: Influencer) => (i.reels > 0 ? Math.round((i.visits / i.reels) * 10) / 10 : 0);
  const influencerRows = influencers.map((i) => [i.name, i.handle ?? "", i.reels, i.visits, perReel(i)]);

  const data = (c: CardDef): CardData => {
    const d = computeCard(c, ctx);
    return d.kind === "influencer" ? { ...d, source: influencersAreReal ? "real" : "example" } : d;
  };

  // ---- downloads ----
  const tables = (): Table[] =>
    selected.map((c) => cardToTable(data(c), influencerRows)).filter((t): t is Table => t !== null);
  const meta = () => ({
    generated: new Date().toLocaleString("en-GB"),
    country: prefs.country === "ALL" ? "Worldwide" : countryName(prefs.country),
    granularity: GRANULARITY_LABEL[prefs.granularity],
    who: `${name} (${canSeeMoney(role) ? "main admin or associate" : "staff: counts only"})`,
  });
  const stamp = () => new Date().toISOString().slice(0, 10);

  async function excel() {
    const t = tables();
    const names = sheetNames(["Summary", ...t.map((x) => x.title)]);
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const sheets = [
      { sheet: names[0], data: summaryRows(meta(), t).map((r) => (r.length ? r : [null])) },
      ...t.map((x, i) => ({ sheet: names[i + 1], data: [[x.title], [x.note], [null], x.header, ...x.rows] })),
    ];
    await writeExcelFile(sheets as never).toFile(`spotted-dashboard-${stamp()}.xlsx`);
  }

  function pdf() {
    const m = meta();
    const items: PdfItem[] = [
      { text: "Spotted dashboard", size: 20, bold: true },
      { text: `Generated: ${m.generated}`, size: 10 },
      { text: `Country: ${m.country}. ${m.granularity}.`, size: 10 },
      { text: `Prepared for: ${m.who}`, size: 10 },
    ];
    for (const t of tables()) {
      const widths = [t.header.length > 2 ? 150 : 250, ...t.header.slice(1).map(() => Math.floor((495 - (t.header.length > 2 ? 150 : 250)) / (t.header.length - 1)))];
      items.push({ text: t.title, size: 13, bold: true, gap: 12 }, { text: t.note, size: 9 }, { cells: t.header, widths, size: 9, bold: true });
      for (const r of t.rows) items.push({ cells: r.map((c) => (typeof c === "number" ? c.toLocaleString("en") : c)), widths, size: 9 });
    }
    download(makePdf(items) as BlobPart, `spotted-dashboard-${stamp()}.pdf`, "application/pdf");
  }

  const groups: CardGroup[] = ["app", "influencers", "restaurants"];
  const toggle = (id: string) => update({ cards: selected.some((c) => c.id === id) ? selected.filter((c) => c.id !== id).map((c) => c.id) : [...selected.map((c) => c.id), id] });

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-extrabold text-heading">Dashboard</h1>
        <button type="button" className={button} onClick={() => void excel().catch(() => setNotice("Could not make the Excel file."))}>
          Download Excel
        </button>
        <button type="button" className={button} onClick={pdf}>
          Download PDF
        </button>
      </div>
      {notice && <p role="status" className="rounded-xl bg-alt p-3 font-bold">{notice}</p>}
      {dashboardAccess(role) === "counts" && <p className="rounded-xl bg-alt p-3 text-sm font-bold">You can see counts only. Money is shown to the main admin and associates.</p>}
      {real === null && <p className="rounded-xl bg-alt p-3 text-sm font-bold">The real numbers could not be loaded, so every card shows EXAMPLE numbers.</p>}

      {/* controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label="Period" className="flex overflow-hidden rounded-full border-2 border-line">
          {GRANULARITIES.map((g) => (
            <button key={g} type="button" aria-pressed={prefs.granularity === g} onClick={() => update({ granularity: g })} className={`min-h-11 px-4 font-extrabold ${prefs.granularity === g ? "bg-accent text-onaccent" : "text-heading"}`}>
              {GRANULARITY_LABEL[g]}
            </button>
          ))}
        </div>
        <div role="group" aria-label="View" className="flex overflow-hidden rounded-full border-2 border-line">
          {(["graph", "table"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={prefs.view === v} onClick={() => update({ view: v })} className={`min-h-11 px-4 font-extrabold capitalize ${prefs.view === v ? "bg-accent text-onaccent" : "text-heading"}`}>
              {v}
            </button>
          ))}
        </div>
        <label className="text-sm font-bold">
          <span className="mb-1 block">Country</span>
          <select value={prefs.country} onChange={(e) => update({ country: e.target.value })} className={field}>
            <option value="ALL">Worldwide</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="rounded-2xl bg-alt p-4">
        <summary className="min-h-11 cursor-pointer font-extrabold">Choose the cards to show ({selected.length} of {allowed.length})</summary>
        <div className="mt-3 flex gap-2">
          <button type="button" className={button} onClick={() => update({ cards: allowed.map((c) => c.id) })}>All</button>
          <button type="button" className={button} onClick={() => update({ cards: [] })}>None</button>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {groups.map((g) => (
            <fieldset key={g}>
              <legend className="mb-1 font-extrabold">{GROUP_TITLE[g]}</legend>
              {allowed.filter((c) => c.group === g).map((c) => (
                <label key={c.id} className="flex min-h-9 cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" checked={selected.some((s) => s.id === c.id)} onChange={() => toggle(c.id)} className="mt-1 size-4" />
                  {c.title}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>

      {groups.map((g) => {
        const cards = selected.filter((c) => c.group === g);
        if (cards.length === 0) return null;
        return (
          <section key={g} className="grid gap-4">
            <h2 className="text-2xl font-extrabold text-heading">{GROUP_TITLE[g]}</h2>
            {g === "restaurants" && (
              <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-alt p-4">
                <label className="text-sm font-bold">
                  <span className="mb-1 block">Open a restaurant&rsquo;s dashboard</span>
                  <select value={prefs.restaurant} onChange={(e) => update({ restaurant: e.target.value })} className={field}>
                    {EXAMPLE_RESTAURANTS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <p className="text-sm font-bold">Coming later: these need the app and payments. Every number here is EXAMPLE.</p>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {cards.map((c) => {
                const d = data(c);
                if (d.kind === "influencer")
                  return (
                    <article key={c.id} className="rounded-3xl bg-box p-5 text-onpanel lg:col-span-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="mr-auto text-xl font-extrabold">{c.title}</h3>
                        <SourceBadge source={d.source} />
                      </div>
                      <label className="mt-3 block text-sm font-bold">
                        <span className="mb-1 block">Pick an Insider</span>
                        <select value={chosen.id} onChange={(e) => update({ influencer: e.target.value })} className={field}>
                          {influencers.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {prefs.view === "graph" ? (
                        <dl className="mt-4 grid grid-cols-3 gap-3">
                          {[["Reels linked", chosen.reels], ["Visits", chosen.visits], ["Visits per reel", perReel(chosen)]].map(([label, value]) => (
                            <div key={label as string} className="rounded-2xl bg-charcoal-deep p-4">
                              <dt className="text-xs text-mist">{label}</dt>
                              <dd className="text-3xl font-extrabold">{(value as number).toLocaleString("en")}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <div className="mt-4">
                          <DataTable header={["Insider", "Handle", "Reels linked", "Visits", "Visits per reel"]} rows={influencerRows} />
                        </div>
                      )}
                    </article>
                  );
                return <CardView key={c.id} data={d} view={prefs.view} granularity={prefs.granularity} />;
              })}
            </div>
          </section>
        );
      })}
      {selected.length === 0 && <p className="rounded-2xl bg-alt p-6 text-center font-bold">No cards chosen. Open &ldquo;Choose the cards to show&rdquo;.</p>}
    </div>
  );
}
