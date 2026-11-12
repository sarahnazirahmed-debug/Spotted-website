"use client";

// /admin/restaurants/view?id=...: the page of one restaurant or shop: its details, its locations and its reels.
// Nothing here deletes anything. A closed place is marked "Permanently closed", not removed.
import { LoadingBlocks } from "@/components/Skeleton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { businessChecklist, niceDateTime, type NotNeeded } from "@/lib/listRules";
import { niceDay } from "@/lib/timeAgo";
import { useAdmin } from "./AdminProvider";
import ChangeHistory from "./ChangeHistory";
import ClosedBadge from "./ClosedBadge";
import { ACCESS_LABEL, hasOrdering, isOrderOnly, orderWays, type OrderRow } from "@/lib/orderOnly";
import { outline, primary } from "./ui";

type Biz = OrderRow & { id: string; code: string; name: string; type: "restaurant" | "shop"; subtype: string | null; instagram_handle: string | null; business_email: string | null; business_whatsapp: string | null; permanently_closed: boolean; not_needed: NotNeeded | null; added_by: string | null; created_at: string };
type Loc = { id: string; code: string; name: string; emirate: string | null; is_building: boolean };
type ReelRow = { id: string; code: string; url: string; place_name: string | null; posted_on: string | null };

const WORD = { filled: "Filled in", not_needed: "Not needed", missing: "Missing" } as const;

export default function BusinessView() {
  const { supabase } = useAdmin();
  const [id] = useState(() => new URLSearchParams(window.location.search).get("id") ?? "");
  const [data, setData] = useState<{ b: Biz; locs: Loc[]; reels: ReelRow[] } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !id) return;
      const [b, l, r] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
        supabase.from("locations").select("id, code, name, emirate, is_building").eq("business_id", id).order("name").limit(1000),
        supabase.from("reels").select("id, code, url, place_name, posted_on").eq("business_id", id).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (dead) return;
      if (!b.data) return setMissing(true);
      setData({ b: b.data as Biz, locs: (l.data as Loc[] | null) ?? [], reels: (r.data as ReelRow[] | null) ?? [] });
    })();
    return () => {
      dead = true;
    };
  }, [supabase, id]);

  if (!id || missing) return <p className="font-bold">That restaurant or shop was not found. <Link href="/admin/restaurants" className="underline">Back to the list</Link></p>;
  if (!data) return <LoadingBlocks className="mx-auto max-w-3xl" />;
  const { b, locs, reels } = data;
  const checks = businessChecklist({ ...b, order_instagram: b.order_instagram, order_whatsapp: b.order_whatsapp }, { locations: locs.length, reels: reels.length });
  const ways = orderWays(b, b.instagram_handle, b.business_whatsapp);
  const orderOnly = isOrderOnly(b);
  const lacking = checks.filter((c) => c.state === "missing");
  const detail: Record<string, string> = {
    name: b.name,
    type: `${b.type === "shop" ? "Shop" : "Restaurant"}${b.subtype ? `, ${b.subtype}` : ""}`,
    instagram_handle: b.instagram_handle ? `@${b.instagram_handle}` : "",
    locations: locs.length ? `${locs.length}` : "",
    reels: reels.length ? `${reels.length}` : "",
    contact: [b.business_email, b.business_whatsapp].filter(Boolean).join(" and "),
    how_to_order: ways.join("; "),
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="grid gap-2">
        <h1 className="flex flex-wrap items-center gap-3 text-4xl font-extrabold text-heading">
          {b.name}
          {orderOnly && <span className="inline-flex min-h-7 items-center rounded-full bg-chip px-3 text-sm font-extrabold text-onchip">Order only</span>}
          {b.permanently_closed && <ClosedBadge />}
        </h1>
        <p className="font-bold">{b.type === "shop" ? "Shop" : "Restaurant"}{b.subtype ? `, ${b.subtype}` : ""}</p>
        <p className="text-sm text-ash">Code <span className="font-extrabold tracking-widest text-heading">{b.code}</span> (team only) · Added by {b.added_by ?? "-"} · {niceDateTime(b.created_at)}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Link href={`/admin/restaurants/edit?id=${b.id}`} className={primary}>Edit</Link>
          <Link href="/admin/add-location" className={outline}>Add a location</Link>
          <Link href="/admin/pin?add=1" className={outline}>Add a reel</Link>
        </div>
      </header>

      <section className="grid gap-2" aria-labelledby="bv-get">
        <h2 id="bv-get" className="text-2xl font-extrabold text-heading">How people get it</h2>
        <p className="font-bold">{ACCESS_LABEL[b.access_kind ?? "place"]}</p>
        {hasOrdering(b) && (
          <>
            <p><span className="font-bold">How to order:</span> {ways.length ? ways.join("; ") : "not filled in yet"}</p>
            <p>
              <span className="font-bold">Where they deliver:</span>{" "}
              {[...(b.deliver_emirates ?? []), b.deliver_areas].filter(Boolean).join(" · ") || "not filled in yet"}
            </p>
          </>
        )}
        {orderOnly && <p className="text-sm font-bold">An order-only place is never used for nearby reminders. No home address is stored.</p>}
      </section>

      <section className="grid gap-2 rounded-2xl bg-panel p-4" aria-labelledby="bv-tick">
        <h2 id="bv-tick" className="flex items-center gap-2 text-2xl font-extrabold text-heading">
          {lacking.length === 0 && (
            <svg viewBox="0 0 20 20" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
          )}
          {lacking.length === 0 ? "Complete" : "Not complete yet"}
        </h2>
        <ul className="grid gap-1">
          {checks.map((c) => (
            <li key={c.key} className="flex flex-wrap gap-x-2">
              <span className="font-bold">{c.label}:</span>
              <span className={c.state === "missing" ? "font-extrabold" : ""}>{WORD[c.state]}{c.state === "filled" && detail[c.key] ? ` (${detail[c.key]})` : ""}</span>
            </li>
          ))}
        </ul>
        {lacking.length > 0 && <p className="text-sm font-bold">An admin can mark a missing detail &quot;Not needed&quot; on the edit page.</p>}
      </section>

      <section className="grid gap-2">
        <h2 className="text-2xl font-extrabold text-heading">Locations ({locs.length})</h2>
        {locs.length === 0 && <p className="font-bold">{orderOnly ? "No place to visit. That is fine for an order-only place." : "No location yet."}</p>}
        <ul className="grid gap-2">
          {locs.map((l) => (
            <li key={l.id} className="rounded-xl bg-box p-3 text-onpanel">
              <Link href={`/admin/locations/edit?id=${l.id}`} className="min-h-11 font-extrabold underline">{l.name}</Link>
              <p className="text-sm">{[l.emirate, l.is_building ? "Mall or hotel" : "Single"].filter(Boolean).join(" · ")} · Code {l.code}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="text-2xl font-extrabold text-heading">Reels ({reels.length})</h2>
        {reels.length === 0 && <p className="font-bold">No reel yet.</p>}
        <ul className="grid gap-2">
          {reels.map((r) => (
            <li key={r.id} className="rounded-xl bg-box p-3 text-onpanel">
              <Link href={`/admin/reels/edit?id=${r.id}`} className="min-h-11 break-all font-extrabold underline">{r.place_name || r.url}</Link>
              <p className="text-sm">Code {r.code}{r.posted_on ? ` · Posted ${niceDay(r.posted_on)}` : ""}</p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">{r.url}</a>
            </li>
          ))}
        </ul>
      </section>

      <ChangeHistory rowId={b.id} version={0} />
    </div>
  );
}
