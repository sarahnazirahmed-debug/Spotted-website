"use client";

// The live counters on the home page: People on Spotted, Saves, Spotted Partners, Spotted Insiders.
// Each one shows for the visitor's country and for the whole world, but only once it passes the number
// you set in src/config/counters.ts. If none has passed, this whole section is hidden.
// The country is guessed from the visitor's connection (Cloudflare's /cdn-cgi/trace), then from the
// browser language. The visitor can pick another country.
import { useEffect, useMemo, useState } from "react";
import { COUNTER_MINIMUMS, COUNTER_ORDER } from "@/config/counters";
import { text } from "@/content";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { countryFromLanguage, parseTraceCountry, pickCounters, type StatRow } from "@/lib/counters";
import { getSupabase } from "@/lib/supabase";

const KEY = "spotted-country";

async function guessCountry(): Promise<string | null> {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && COUNTRY_CODES.includes(saved)) return saved;
  } catch {
    // storage blocked: carry on
  }
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 3000);
    const res = await fetch("/cdn-cgi/trace", { signal: ctl.signal, cache: "no-store" });
    window.clearTimeout(timer);
    const found = parseTraceCountry(await res.text());
    if (found) return found;
  } catch {
    // not on Cloudflare (for example on a laptop): use the language
  }
  return countryFromLanguage(navigator.language);
}

const fmt = (n: number) => n.toLocaleString("en");

export default function LiveCounters() {
  const t = text.counters;
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const [stats, guess] = await Promise.all([supabase.rpc("public_stats"), guessCountry()]);
      if (dead || stats.error || !stats.data) return;
      setRows(stats.data as StatRow[]);
      setCountry(guess);
    })();
    return () => {
      dead = true;
    };
  }, []);

  const shown = useMemo(() => (rows ? pickCounters(rows, country, COUNTER_MINIMUMS, COUNTER_ORDER) : []), [rows, country]);
  const names = useMemo(() => COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)), []);

  if (!rows || shown.length === 0) return null;

  return (
    <section className="bg-alt px-5 py-16 text-onpage md:py-24" aria-labelledby="counters-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="counters-title" className="text-[clamp(1.8rem,5vw,3rem)] font-extrabold leading-tight text-heading">
            {text.home.countersTitle}
          </h2>
          <label className="text-sm font-bold">
            <span className="mb-1 block">{t.pickerLabel}</span>
            <select
              value={country ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                setCountry(v);
                try {
                  if (v) localStorage.setItem(KEY, v);
                  else localStorage.removeItem(KEY);
                } catch {
                  // not remembered: fine
                }
              }}
              className="min-h-11 rounded-xl bg-paper px-3 text-base font-medium text-charcoal"
            >
              <option value="">{t.pickerNone}</option>
              {names.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((s) => (
            <div key={s.metric} className="rounded-3xl bg-box p-6 text-onpanel">
              <p className="text-sm font-bold text-mist">{t.labels[s.metric as keyof typeof t.labels]}</p>
              {s.country !== undefined && country && (
                <p className="mt-3">
                  <span className="block text-3xl font-extrabold">{fmt(s.country)}</span>
                  <span className="text-sm text-mist">{t.inCountry(countryName(country))}</span>
                </p>
              )}
              {s.world !== undefined && (
                <p className="mt-3">
                  <span className={`block font-extrabold ${s.country !== undefined ? "text-xl" : "text-3xl"}`}>{fmt(s.world)}</span>
                  <span className="text-sm text-mist">{t.worldwide}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
