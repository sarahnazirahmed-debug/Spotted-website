"use client";

// /admin/reels/edit?id=...: change one reel (the same form as on the Pin Desk), with its history.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Deal, Offer } from "@/lib/reelDeals";
import { saveReelExtras, type Extras } from "@/lib/reelExtrasSave";
import type { BizOption, LocOption } from "@/lib/reelPlace";
import type { Reel, ReelInput } from "@/lib/reelTypes";
import { canDeleteReels } from "@/lib/teamRules";
import { useAdmin } from "./AdminProvider";
import ChangeHistory from "./ChangeHistory";
import ReelForm from "./ReelForm";

type DealRow = Omit<Deal, "prices"> & { reel_deal_prices: Deal["prices"] };

export default function ReelEdit() {
  const { supabase, me } = useAdmin();
  const router = useRouter();
  const [id] = useState(() => new URLSearchParams(window.location.search).get("id") ?? "");
  const [reel, setReel] = useState<Reel | null>(null);
  const [missing, setMissing] = useState(false);
  const [businesses, setBusinesses] = useState<BizOption[]>([]);
  const [locations, setLocations] = useState<LocOption[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !id) return;
      const [r, b, l, c, d, o] = await Promise.all([
        supabase.from("reels").select("*").eq("id", id).maybeSingle(),
        supabase.from("businesses").select("id, name, type, code").order("name").limit(10000),
        supabase.from("locations").select("id, name, emirate, maps_url, lat, lng, is_building, business_id").order("name").limit(10000),
        supabase.from("reels").select("collection").not("collection", "is", null).limit(5000),
        supabase.from("reel_deals").select("id, title, included, conditions, end_date, reel_deal_prices(people, total_price_aed)").eq("reel_id", id),
        supabase.from("reel_offers").select("*").eq("reel_id", id),
      ]);
      if (dead) return;
      if (!r.data) return setMissing(true);
      setReel(r.data as Reel);
      setBusinesses((b.data as BizOption[] | null) ?? []);
      setLocations((l.data as LocOption[] | null) ?? []);
      setCollections([...new Set(((c.data as { collection: string }[] | null) ?? []).map((x) => x.collection))].sort());
      setDeals(((d.data as DealRow[] | null) ?? []).map(({ reel_deal_prices, ...x }) => ({ ...x, prices: reel_deal_prices ?? [] })));
      setOffers((o.data as Offer[] | null) ?? []);
    })();
    return () => {
      dead = true;
    };
  }, [supabase, id, version]);

  if (!id || missing) return <p className="font-bold">That reel was not found. <Link href="/admin/reels" className="underline">Back to the list</Link></p>;
  if (!reel) return <p>Loading...</p>;

  async function save(values: ReelInput, extras: Extras): Promise<string | null> {
    // the link itself never changes; only the facts do
    const { url: _u, link_key: _k, platform: _p, ...facts } = values;
    void _u; void _k; void _p;
    const { error } = await supabase!.from("reels").update(facts).eq("id", reel!.id);
    if (error) return `The database did not allow that (${error.message}).`;
    const problem = await saveReelExtras(supabase!, reel!.id, extras, deals);
    setNotice(problem ? `Saved, but ${problem}` : "Saved.");
    setVersion((n) => n + 1);
    return null;
  }

  async function remove() {
    const r = await supabase!.from("reels").delete().eq("id", reel!.id).select("id");
    if (r.error || (r.data?.length ?? 0) === 0) return setNotice("Only the main admin and associates can delete a reel.");
    router.push("/admin/reels");
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-extrabold text-heading">Edit reel</h1>
        <Link href="/admin/reels" className="flex min-h-12 items-center rounded-full border-2 border-line px-6 text-lg font-extrabold text-heading hover:bg-alt">Back to the list</Link>
      </div>
      {notice && <p role="status" className="rounded-xl bg-alt p-3 font-bold">{notice}</p>}
      <ReelForm
        key={`${reel.id}-${version}`}
        businesses={businesses}
        locations={locations}
        onBusinessCreated={(b) => setBusinesses((o) => [...o, b])}
        initialDeals={deals}
        initialOffers={offers}
        initial={reel}
        isNew={false}
        collections={collections}
        canDelete={canDeleteReels(me?.role ?? null)}
        onSave={save}
        onDelete={remove}
        onCancel={() => router.push("/admin/reels")}
      />
      <ChangeHistory rowId={reel.id} version={version} />
    </div>
  );
}
