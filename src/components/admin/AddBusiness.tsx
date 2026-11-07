"use client";

// /admin/add-restaurant: add a restaurant or a shop.
// The code is made by the database when you press Save. It is never typed. It is for the team only.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  businessProblem,
  cleanHandle,
  KINDS,
  kindToSave,
  OTHER_KIND,
  similarNames,
  type BusinessType,
} from "@/lib/businessRules";
import { useAdmin } from "./AdminProvider";

type Known = { name: string; code: string; type: BusinessType };

const field = "min-h-11 w-full rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";
const button = "flex min-h-12 items-center justify-center rounded-full px-6 text-lg font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-heading";

const empty = { name: "", type: "" as BusinessType | "", kind: "", otherKind: "", instagram: "", email: "", whatsapp: "" };

export default function AddBusiness() {
  const { supabase } = useAdmin();
  const [v, setV] = useState(empty);
  const [known, setKnown] = useState<Known[]>([]);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ code: string; name: string } | null>(null);
  const set = (k: keyof typeof empty, value: string) => setV((o) => ({ ...o, [k]: value }));

  // the names already saved, to warn about a similar one
  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase) return;
      const { data } = await supabase.from("businesses").select("name, code, type").limit(10000);
      if (!dead) setKnown((data as Known[]) ?? []);
    })();
    return () => {
      dead = true;
    };
  }, [supabase, saved]);

  const similar = similarNames(v.name, known);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = businessProblem(v);
    setProblem(p ?? "");
    if (p || !supabase || !v.type) return;
    setBusy(true);
    const handle = cleanHandle(v.instagram);
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        name: v.name.trim(),
        type: v.type,
        subtype: kindToSave(v.type, v.kind, v.otherKind),
        instagram_handle: handle || null,
        business_email: v.email.trim() || null,
        business_whatsapp: v.whatsapp.trim() || null,
      })
      .select("code, name")
      .single();
    setBusy(false);
    if (error || !data) {
      setProblem(error?.message ?? "It did not save. Please try again.");
      return;
    }
    setSaved(data as { code: string; name: string });
  }

  if (saved)
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        <h1 className="text-4xl font-extrabold text-heading">Saved</h1>
        <p className="text-xl font-bold">{saved.name}</p>
        <div className="rounded-3xl bg-panel p-6">
          <p className="text-sm font-bold text-ash">Code (for the team only)</p>
          <p className="mt-1 break-all text-4xl font-extrabold tracking-widest text-heading" aria-label="Code">{saved.code}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`${button} bg-accent text-onaccent`}
            onClick={() => {
              setSaved(null);
              setV(empty);
              setProblem("");
            }}
          >
            Add another
          </button>
          <Link href="/admin" className={`${button} border-2 border-line text-heading hover:bg-alt`}>
            Back to the Pin Desk
          </Link>
        </div>
      </div>
    );

  return (
    <form onSubmit={save} className="mx-auto grid max-w-2xl gap-5" noValidate>
      <h1 className="text-4xl font-extrabold text-heading">Add restaurant or shop</h1>

      <div>
        <label htmlFor="b-name" className={label}>Name</label>
        <input id="b-name" className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={160} autoComplete="off" />
      </div>

      {similar.length > 0 && (
        <div role="status" className="rounded-2xl border-2 border-line bg-alt p-4">
          <p className="font-extrabold text-heading">A similar name is already saved. Is it the same place?</p>
          <ul className="mt-2 grid gap-1">
            {similar.map((s) => (
              <li key={s.code} className="text-base">
                <span className="font-bold">{s.name}</span> ({s.type === "shop" ? "Shop" : "Restaurant"}, code {s.code})
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ash">You can still save. Two places can have the same name.</p>
        </div>
      )}

      <fieldset>
        <legend className={label}>Type</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["restaurant", "shop"] as const).map((t) => (
            <label
              key={t}
              className={`flex min-h-14 cursor-pointer items-center justify-center rounded-full border-2 px-4 text-lg font-extrabold focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-heading ${v.type === t ? "border-accent bg-accent text-onaccent" : "border-line text-heading"}`}
            >
              <input type="radio" name="type" value={t} checked={v.type === t} className="sr-only" onChange={() => setV((o) => ({ ...o, type: t, kind: "", otherKind: "" }))} />
              {t === "restaurant" ? "Restaurant" : "Shop"}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-ash">
          {v.type === "shop" ? "Shop = not food or drink." : "Restaurant = anything food or drink: restaurant, cafe, cafeteria, bakery, sweets, cloud kitchen, home kitchen."}
        </p>
      </fieldset>

      {v.type && (
        <div>
          <label htmlFor="b-kind" className={label}>Kind (you can choose later)</label>
          <select id="b-kind" className={field} value={v.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="">Choose later</option>
            {KINDS[v.type].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      )}
      {v.type === "shop" && v.kind === OTHER_KIND && (
        <div>
          <label htmlFor="b-other" className={label}>What kind of shop?</label>
          <input id="b-other" className={field} value={v.otherKind} onChange={(e) => set("otherKind", e.target.value)} maxLength={80} />
        </div>
      )}

      <p className="rounded-2xl bg-alt p-3 text-sm font-bold text-ash">The next three are for the business only. Never a personal account, email or number.</p>

      <div>
        <label htmlFor="b-ig" className={label}>Instagram handle</label>
        <input id="b-ig" className={field} value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@theirhandle" autoCapitalize="none" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="b-email" className={label}>Business email</label>
        <input id="b-email" type="email" className={field} value={v.email} onChange={(e) => set("email", e.target.value)} autoCapitalize="none" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="b-wa" className={label}>Business WhatsApp</label>
        <input id="b-wa" type="tel" className={field} value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+971 ..." autoComplete="off" />
      </div>

      {problem && <p role="alert" className="font-bold text-heading">{problem}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="submit" disabled={busy} className={`${button} bg-accent text-onaccent disabled:opacity-60`}>
          {busy ? "Saving" : "Save"}
        </button>
        <Link href="/admin" className={`${button} border-2 border-line text-heading hover:bg-alt`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
