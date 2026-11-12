"use client";

// The Insider dashboard: five number cards, an "Add a reel" box, and the list "My reels" (newest first).
// Money is shown ONLY as a range ("10K to 50K") or "None yet": the real amount never reaches the website.
// A new reel is "Waiting for our check" until the team links the place. Only the link is stored.
import { useCallback, useEffect, useState } from "react";
import { text } from "@/content";
import { reelProblem } from "@/lib/memberRules";
import DashboardFrame, { addButton, card, inputCls, labelCls, removeButton, StatCard } from "./DashboardFrame";
import { useMember } from "./useMember";

type Reel = { id: string; url: string; place_name: string | null; posted_on: string | null; status: "waiting" | "checked"; created_at: string };
const t = text.dashboard;

export default function InsiderDashboard() {
  const { state, numbers, supabase, reload, signOut } = useMember("insider");
  const [reels, setReels] = useState<Reel[]>([]);
  const [form, setForm] = useState({ url: "", placeName: "", postedOn: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchReels = useCallback(async () => {
    if (!supabase) return [];
    const { data } = await supabase.from("insider_reels").select("*").order("created_at", { ascending: false });
    return (data as Reel[]) ?? [];
  }, [supabase]);

  useEffect(() => {
    if (state !== "ready") return;
    let dead = false;
    void fetchReels().then((r) => {
      if (!dead) setReels(r);
    });
    return () => {
      dead = true;
    };
  }, [state, fetchReels]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const problem = reelProblem(form);
    if (problem) return setMessage(problem);
    setBusy(true);
    // member_id is filled in by the database (it is always the logged-in member)
    const { error } = await supabase!.from("insider_reels").insert({
      url: form.url.trim(),
      place_name: form.placeName.trim() || null,
      posted_on: form.postedOn || null,
    });
    setBusy(false);
    if (error) return setMessage(t.failed);
    setForm({ url: "", placeName: "", postedOn: "" });
    setMessage("");
    setReels(await fetchReels());
    await reload();
  }

  async function remove(r: Reel) {
    if (!window.confirm(t.removeAsk)) return;
    const { error } = await supabase!.from("insider_reels").delete().eq("id", r.id);
    if (error) return setMessage(t.failed);
    setReels(await fetchReels());
    await reload();
  }

  const n = numbers;
  return (
    <DashboardFrame title={t.insiderTitle} state={state} signOut={signOut} numbers={n}>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t.greenStars} value={n?.green_stars ?? 0} star="visit" />
        <StatCard label={t.yellowStars} value={n?.yellow_stars ?? 0} star="sale" />
        <StatCard label={t.saves} value={n?.saves ?? 0} />
        <StatCard label={t.reelsAdded} value={n?.reels_added ?? 0} />
        <StatCard label={t.amount} value={<span className="text-2xl">{n?.amount_range ?? "None yet"}</span>} />
      </ul>

      <section className={`${card} mt-8`}>
        <h2 className="font-brand text-2xl font-bold">{t.addReelTitle}</h2>
        <form onSubmit={add} noValidate className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="reel-url" className={labelCls}>{t.reelLink}</label>
            <input id="reel-url" type="url" inputMode="url" className={inputCls} placeholder="https://" value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); setMessage(""); }} />
          </div>
          <div>
            <label htmlFor="reel-place" className={labelCls}>{t.placeName} <span className="font-medium text-mutedtext">({t.optional})</span></label>
            <input id="reel-place" className={inputCls} value={form.placeName} onChange={(e) => setForm({ ...form, placeName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reel-date" className={labelCls}>{t.postedOn} <span className="font-medium text-mutedtext">({t.optional})</span></label>
            <input id="reel-date" type="date" className={`${inputCls} [color-scheme:light]`} value={form.postedOn} onChange={(e) => setForm({ ...form, postedOn: e.target.value })} />
          </div>
          {message && <p role="alert" className="text-base font-bold text-problem md:col-span-2">{message}</p>}
          <div className="md:col-span-2">
            <button type="submit" disabled={busy} className={addButton}>{busy ? t.adding : t.add}</button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-brand text-2xl font-bold">{t.myReels}</h2>
        <ul className="mt-4 grid gap-3">
          {reels.map((r) => (
            <li key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-maroonink underline">{r.url}</a>
                <p className="mt-1 text-sm text-mutedtext">
                  {[r.place_name, r.posted_on && new Date(r.posted_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" - ")}
                </p>
                <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${r.status === "waiting" ? "bg-pinktint text-maroonink" : "bg-maroon text-cream"}`}>
                  {r.status === "waiting" ? t.waiting : t.checked}
                </span>
              </div>
              <button type="button" onClick={() => remove(r)} className={removeButton}>{t.remove}</button>
            </li>
          ))}
          {reels.length === 0 && <li className="text-base text-mutedtext">{t.noReels}</li>}
        </ul>
      </section>
    </DashboardFrame>
  );
}
