"use client";

// One list of the Pin Desk: a heading, a search box, and one card per row. Each card opens its edit page.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { matches } from "@/lib/listRules";
import { field, outline, primary } from "./ui";

export type ListRow = {
  id: string;
  href: string; // the edit page
  title: string;
  ticked?: boolean; // shows a tick (a complete restaurant or shop)
  search: string; // all the words the search box looks in
  cells: [string, ReactNode][];
};

export default function ListShell({ title, addHref, addLabel, rows, loaded, empty }: {
  title: string;
  addHref: string;
  addLabel: string;
  rows: ListRow[];
  loaded: boolean;
  empty: string;
}) {
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => matches(r.search, q));
  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-extrabold text-heading">{title}</h1>
        <div className="flex gap-2">
          <Link href={addHref} className={primary}>{addLabel}</Link>
          <Link href="/admin" className={outline}>Home</Link>
        </div>
      </div>
      <div>
        <label htmlFor="list-q" className="mb-1 block text-sm font-bold">Search</label>
        <input id="list-q" className={field} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        <p className="mt-1 text-sm text-ash" role="status">{loaded ? `${shown.length} of ${rows.length}, newest on top` : "Loading..."}</p>
      </div>
      <ul className="grid gap-3">
        {shown.map((r) => (
          <li key={r.id} className="rounded-2xl bg-box p-4 text-onpanel">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <Link href={r.href} className="min-h-11 break-words underline focus-visible:outline-4 focus-visible:outline-offset-2">{r.title}</Link>
              {r.ticked && (
                <span className="inline-flex items-center gap-1 text-sm font-bold">
                  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
                  Complete
                </span>
              )}
            </h2>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {r.cells.map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-x-2">
                  <dt className="font-bold text-mist">{k}:</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={r.href} className="mt-3 flex min-h-11 w-fit items-center rounded-full border-2 border-line px-5 font-extrabold">Open and edit</Link>
          </li>
        ))}
      </ul>
      {loaded && rows.length === 0 && <p className="rounded-2xl bg-alt p-6 text-center font-bold">{empty}</p>}
    </div>
  );
}
