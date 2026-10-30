"use client";

// The place directory (Part B, behind the businessDirectory switch).
// Default view: a curved row of cards. Only the centre card plays its video; the others show a still.
// Top of the section: View options (Row | List | Grid), a Search button, and filter chips
// (Emirate, Category, Has offers).
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import DishMedia from "./DishMedia";
import FlashCard from "./FlashCard";
import { COPY } from "./copy";
import type { Kind, Place } from "./data";

type View = "row" | "list" | "grid";

const chip =
  "min-h-11 rounded-full border-2 border-lilac bg-page px-4 text-sm font-bold text-heading outline-none focus-visible:ring-4 focus-visible:ring-lilac";

function CurvedRow({ places }: { places: Place[] }) {
  const [centre, setCentre] = useState(0);
  const start = useRef<number | null>(null);
  const c = Math.min(centre, places.length - 1);
  const go = (d: number) => setCentre((i) => Math.min(places.length - 1, Math.max(0, Math.min(i, places.length - 1) + d)));
  return (
    <div
      role="region"
      aria-label="Places, curved row. Use the left and right arrow keys."
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current !== null && Math.abs(e.clientX - start.current) > 50) go(e.clientX < start.current ? 1 : -1);
        start.current = null;
      }}
      className="relative mx-auto h-[27rem] max-w-5xl overflow-hidden rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-lilac"
      style={{ perspective: "1100px", touchAction: "pan-y" }}
    >
      {places.map((p, i) => {
        const d = i - c;
        const far = Math.abs(d) > 3;
        return (
          <div
            key={p.id}
            className="absolute left-1/2 top-4 w-60 transition-all duration-500 sm:w-64"
            style={{
              transform: `translateX(calc(-50% + ${d * 12.5}rem)) translateY(${d * d * 0.9}rem) translateZ(${-Math.abs(d) * 110}px) rotateY(${-d * 24}deg) scale(${d === 0 ? 1 : 0.9})`,
              opacity: far ? 0 : 1 - Math.abs(d) * 0.18,
              zIndex: 10 - Math.abs(d),
              pointerEvents: far ? "none" : "auto",
            }}
          >
            <div
              className="overflow-hidden rounded-3xl bg-box text-white shadow-xl"
              onClick={() => d !== 0 && setCentre(i)}
              role={d === 0 ? undefined : "button"}
              aria-label={d === 0 ? undefined : `Show ${p.name}`}
            >
              <DishMedia place={p} active={d === 0} className="h-56 w-full" />
              <div className="p-4">
                <p className="text-xl font-extrabold leading-tight">{p.name}</p>
                <p className="mt-1 text-sm font-bold text-lilac">
                  {p.area}, {p.emirate}
                </p>
                {d === 0 && (
                  <Link
                    href={`/${p.kind}/${p.id}`}
                    className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-white text-base font-extrabold text-deep transition active:scale-95"
                  >
                    View place
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="Previous place"
        onClick={() => go(-1)}
        disabled={c === 0}
        className="absolute left-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next place"
        onClick={() => go(1)}
        disabled={c >= places.length - 1}
        className="absolute right-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function Directory({ kind, places }: { kind: Kind; places: Place[] }) {
  const [view, setView] = useState<View>("row");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [emirate, setEmirate] = useState("");
  const [category, setCategory] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);

  const emirates = useMemo(() => [...new Set(places.map((p) => p.emirate))], [places]);
  const categories = useMemo(() => [...new Set(places.map((p) => p.category))], [places]);
  const shown = places.filter((p) => {
    const q = query.trim().toLowerCase();
    if (q && !`${p.name} ${p.area} ${p.emirate} ${p.category}`.toLowerCase().includes(q)) return false;
    if (emirate && p.emirate !== emirate) return false;
    if (category && p.category !== category) return false;
    if (offersOnly && p.offers.length === 0) return false;
    return true;
  });

  const seg = (v: View, text: string) => (
    <button
      key={v}
      type="button"
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`min-h-11 px-4 text-sm font-extrabold ${view === v ? "bg-brand text-white" : "bg-page text-heading"}`}
    >
      {text}
    </button>
  );

  return (
    <section id="places" className="bg-page px-5 py-16 text-onpage">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-[clamp(1.8rem,5vw,2.8rem)] font-extrabold leading-tight text-heading">
            {COPY[kind].word} on Spotted
          </h2>
          <span className="rounded-full bg-lilac px-4 py-1 text-xs font-extrabold text-deep">EXAMPLE PLACES</span>
        </div>
        <p className="mt-2 text-sm font-bold">These places are examples, to show how the page will look. Real partners are coming.</p>

        {/* view options, search, filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="View options" className="flex overflow-hidden rounded-full border-2 border-lilac">
            {seg("row", "Row")}
            {seg("list", "List")}
            {seg("grid", "Grid")}
          </div>
          <button
            type="button"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
            className={`${chip} flex items-center gap-2`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />
            </svg>
            Search
          </button>
          <select aria-label="Emirate" value={emirate} onChange={(e) => setEmirate(e.target.value)} className={chip}>
            <option value="">Emirate: all</option>
            {emirates.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={chip}>
            <option value="">Category: all</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={offersOnly}
            onClick={() => setOffersOnly((o) => !o)}
            className={`${chip} ${offersOnly ? "!bg-brand !text-white" : ""}`}
          >
            Has offers
          </button>
        </div>
        {searchOpen && (
          <input
            type="search"
            autoFocus
            aria-label="Search places"
            placeholder="Search by name, area or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3 min-h-12 w-full rounded-full border-2 border-lilac bg-page px-5 text-base font-medium text-heading outline-none focus:ring-4 focus:ring-lilac"
          />
        )}

        <div className="mt-8">
          {shown.length === 0 ? (
            <p role="status" className="rounded-3xl bg-alt p-8 text-center text-lg font-bold">
              No places match. Try clearing a filter.
            </p>
          ) : view === "row" ? (
            <CurvedRow places={shown} />
          ) : view === "list" ? (
            <div className="grid gap-4">
              {shown.map((p) => (
                <FlashCard key={p.id} place={p} layout="list" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {shown.map((p) => (
                <FlashCard key={p.id} place={p} layout="grid" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
