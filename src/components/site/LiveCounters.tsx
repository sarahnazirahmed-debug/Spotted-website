"use client";

// The live counters on the home page (UAE only): Accounts, Saved places, Saved reels, and later Spotted Partners and Spotted Insiders.
// The whole bar stays hidden until accounts, saved places and saved reels are EACH above 500 (src/config/counters.ts).
// Partners and Insiders tiles join once each is above 100. They are totals only, never any person's details.
import { useEffect, useMemo, useState } from "react";
import { COUNTER_COUNTRY, COUNTER_LATER, COUNTER_MINIMUMS, COUNTER_REQUIRED } from "@/config/counters";
import { text } from "@/content";
import { pickBar, type StatRow } from "@/lib/counters";
import { getSupabase } from "@/lib/supabase";

const fmt = (n: number) => n.toLocaleString("en");

export default function LiveCounters() {
  const t = text.counters;
  const [rows, setRows] = useState<StatRow[] | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const stats = await supabase.rpc("public_stats");
      if (dead || stats.error || !stats.data) return;
      setRows(stats.data as StatRow[]);
    })();
    return () => {
      dead = true;
    };
  }, []);

  const tiles = useMemo(() => (rows ? pickBar(rows, COUNTER_COUNTRY, COUNTER_MINIMUMS, COUNTER_REQUIRED, COUNTER_LATER) : []), [rows]);
  if (tiles.length === 0) return null;

  return (
    <section className="bg-alt px-5 py-16 text-onpage md:py-24" aria-labelledby="counters-title">
      <div className="mx-auto max-w-5xl">
        <h2 id="counters-title" className="mb-2 text-[clamp(1.8rem,5vw,3rem)] font-extrabold leading-tight text-heading">
          {text.home.countersTitle}
        </h2>
        <p className="mb-8 text-lg font-bold">{t.inUae}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((s) => (
            <div key={s.metric} className="rounded-3xl bg-box p-6 text-onpanel">
              <p className="text-sm font-bold text-mist">{t.labels[s.metric as keyof typeof t.labels]}</p>
              <p className="mt-3 text-3xl font-extrabold">{fmt(s.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
