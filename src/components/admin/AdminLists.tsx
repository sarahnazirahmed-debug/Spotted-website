"use client";

// The three lists: Locations, Restaurants and shops, Reels. Newest on top. "Added by" comes from the log-in (the database fills it in).
import { useEffect, useState } from "react";
import { businessChecklist, businessComplete, newestFirst, niceDateTime, yesNo, type NotNeeded } from "@/lib/listRules";
import { niceDay } from "@/lib/timeAgo";
import { useAdmin } from "./AdminProvider";
import { ACCESS_LABEL, type Access } from "@/lib/orderOnly";
import ListShell, { type ListRow } from "./ListShell";

// ask the database for several lists at once, then put the answer on the page (the async function sets state after waiting)
function useLoad<T>(ask: (db: NonNullable<ReturnType<typeof useAdmin>["supabase"]>) => Promise<T>) {
  const { supabase } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase) return;
      const d = await ask(supabase);
      if (!dead) setData(d);
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);
  return data;
}

type Loc = { id: string; code: string; name: string; business_id: string | null; is_building: boolean; added_by: string | null; created_at: string };
export function LocationsList() {
  const data = useLoad(async (db) => ((await db.from("locations").select("id, code, name, business_id, is_building, added_by, created_at").order("created_at", { ascending: false }).limit(10000)).data as Loc[] | null) ?? []);
  const rows: ListRow[] = newestFirst(data ?? []).map((l) => ({
    id: l.id,
    href: `/admin/locations/edit?id=${l.id}`,
    title: l.name,
    search: `${l.name} ${l.code} ${l.added_by ?? ""}`,
    cells: [
      ["Code", l.code],
      ["Linked to a restaurant or shop", yesNo(!!l.business_id)],
      ["Kind", l.is_building ? "Mall or hotel" : "Single"],
      ["Added by", l.added_by ?? "-"],
      ["Added", niceDateTime(l.created_at)],
    ],
  }));
  return <ListShell title="Locations" addHref="/admin/add-location" addLabel="Add location" rows={rows} loaded={data !== null} empty="No locations yet." />;
}

type Biz = { access_kind?: Access; order_instagram?: boolean; order_whatsapp?: boolean; order_website?: string | null; order_app?: string | null; permanently_closed: boolean; id: string; code: string; name: string; type: "restaurant" | "shop"; subtype: string | null; instagram_handle: string | null; business_email: string | null; business_whatsapp: string | null; not_needed: NotNeeded | null; added_by: string | null; created_at: string };
export function RestaurantsList() {
  const data = useLoad(async (db) => {
    const [b, r, l] = await Promise.all([
      db.from("businesses").select("*").order("created_at", { ascending: false }).limit(10000),
      db.from("reels").select("business_id").not("business_id", "is", null).limit(50000),
      db.from("locations").select("business_id").not("business_id", "is", null).limit(50000),
    ]);
    return {
      businesses: (b.data as Biz[] | null) ?? [],
      withReel: new Set(((r.data as { business_id: string }[] | null) ?? []).map((x) => x.business_id)),
      withLocation: new Set(((l.data as { business_id: string }[] | null) ?? []).map((x) => x.business_id)),
    };
  });
  const counts = (id: string) => ({ locations: data?.withLocation.has(id) ? 1 : 0, reels: data?.withReel.has(id) ? 1 : 0 });
  const makeRow = (b: Biz, extra?: ListRow["cells"]): ListRow => ({
    id: b.id,
    href: `/admin/restaurants/view?id=${b.id}`,
    editHref: `/admin/restaurants/edit?id=${b.id}`,
    title: b.name,
    badge: b.access_kind === "order_only" ? "Order only" : undefined,
    closed: b.permanently_closed,
    ticked: businessComplete(b, counts(b.id)),
    search: `${b.name} ${b.code} ${b.type} ${b.added_by ?? ""}`,
    cells: [
      ["Code", b.code],
      ["Type", b.type === "shop" ? "Shop" : "Restaurant"],
      ["How people get it", ACCESS_LABEL[b.access_kind ?? "place"]],
      ["Has a reel", yesNo(!!data?.withReel.has(b.id))],
      ["Has a location", yesNo(!!data?.withLocation.has(b.id))],
      ...(extra ?? []),
      ["Added by", b.added_by ?? "-"],
      ["Added", niceDateTime(b.created_at)],
    ],
  });
  const rows: ListRow[] = newestFirst(data?.businesses ?? []).map((b) => makeRow(b));
  return <ListShell title="Restaurants and shops" addHref="/admin/add-restaurant" addLabel="Add restaurant or shop" rows={rows} loaded={data !== null} empty="No restaurants or shops yet." />;
}

// Places without a tick, with what is still missing.
export function IncompleteList() {
  const data = useLoad(async (db) => {
    const [b, r, l] = await Promise.all([
      db.from("businesses").select("*").order("created_at", { ascending: false }).limit(10000),
      db.from("reels").select("business_id").not("business_id", "is", null).limit(50000),
      db.from("locations").select("business_id").not("business_id", "is", null).limit(50000),
    ]);
    return {
      businesses: (b.data as Biz[] | null) ?? [],
      withReel: new Set(((r.data as { business_id: string }[] | null) ?? []).map((x) => x.business_id)),
      withLocation: new Set(((l.data as { business_id: string }[] | null) ?? []).map((x) => x.business_id)),
    };
  });
  const rows: ListRow[] = newestFirst(data?.businesses ?? [])
    .map((b) => ({ b, missing: businessChecklist(b, { locations: data?.withLocation.has(b.id) ? 1 : 0, reels: data?.withReel.has(b.id) ? 1 : 0 }).filter((c) => c.state === "missing") }))
    .filter((x) => x.missing.length > 0)
    .map(({ b, missing }) => ({
      id: b.id,
      href: `/admin/restaurants/view?id=${b.id}`,
      editHref: `/admin/restaurants/edit?id=${b.id}`,
      title: b.name,
      badge: b.access_kind === "order_only" ? "Order only" : undefined,
      closed: b.permanently_closed,
      search: `${b.name} ${b.code} ${b.type} ${missing.map((m) => m.label).join(" ")}`,
      cells: [["Missing", missing.map((m) => m.label).join(", ")], ["Code", b.code], ["Type", b.type === "shop" ? "Shop" : "Restaurant"], ["Added by", b.added_by ?? "-"], ["Added", niceDateTime(b.created_at)]] as ListRow["cells"],
    }));
  return <ListShell title="Incomplete" addHref="/admin/add-restaurant" addLabel="Add restaurant or shop" rows={rows} loaded={data !== null} empty="Every restaurant and shop has a tick." />;
}

type ReelRow = { id: string; url: string; code: string; place_name: string | null; creator_handle: string | null; business_id: string | null; location_id: string | null; posted_on: string | null; added_by: string | null; created_at: string };
export function ReelsList() {
  const data = useLoad(async (db) => {
    const [r, b, l, d, o] = await Promise.all([
      db.from("reels").select("id, url, code, place_name, creator_handle, business_id, location_id, posted_on, added_by, created_at").order("created_at", { ascending: false }).limit(10000),
      db.from("businesses").select("id, name").limit(10000),
      db.from("locations").select("id, name").limit(10000),
      db.from("reel_deals").select("reel_id").limit(50000),
      db.from("reel_offers").select("reel_id").limit(50000),
    ]);
    const names = (x: unknown) => new Map(((x as { id: string; name: string }[] | null) ?? []).map((v) => [v.id, v.name]));
    return {
      reels: (r.data as ReelRow[] | null) ?? [],
      biz: names(b.data),
      loc: names(l.data),
      withDeal: new Set([...((d.data as { reel_id: string }[] | null) ?? []), ...((o.data as { reel_id: string }[] | null) ?? [])].map((x) => x.reel_id)),
    };
  });
  const rows: ListRow[] = newestFirst(data?.reels ?? []).map((r) => {
    const place = [data?.biz.get(r.business_id ?? ""), data?.loc.get(r.location_id ?? "")].filter(Boolean).join(" at ");
    return {
      id: r.id,
      href: `/admin/reels/edit?id=${r.id}`,
      title: place || r.place_name || "(no place yet)",
      search: `${place} ${r.place_name ?? ""} ${r.code} ${r.url} ${r.creator_handle ?? ""} ${r.added_by ?? ""}`,
      cells: [
        ["Link", <a key="l" href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.url}</a>],
        ["Code", r.code],
        ["Instagram handle", r.creator_handle ?? "-"],
        ["Linked place", place || "none yet"],
        ["Posted on", r.posted_on ? niceDay(r.posted_on) : "-"],
        ["Has a deal", yesNo(!!data?.withDeal.has(r.id))],
        ["Added by", r.added_by ?? "-"],
        ["Added", niceDateTime(r.created_at)],
      ],
    };
  });
  return <ListShell title="Reels" addHref="/admin/pin?add=1" addLabel="Add reel" rows={rows} loaded={data !== null} empty="No reels yet." />;
}
