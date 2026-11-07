"use client";

// /admin/restaurants/edit?id=...: change a restaurant or shop. "Not needed" marks a detail the place does not have, so it counts as complete.
// The code is shown but can never be changed. Every change is logged with who made it (the database does that).
import Link from "next/link";
import { useEffect, useState } from "react";
import { businessComplete, niceDateTime, type NotNeeded } from "@/lib/listRules";
import { businessProblem, cleanHandle, KINDS, OTHER_KIND, kindToSave, type BusinessType } from "@/lib/businessRules";
import { useAdmin } from "./AdminProvider";
import ChangeHistory from "./ChangeHistory";
import { field, label, outline, primary } from "./ui";

type Row = { id: string; code: string; name: string; type: BusinessType; subtype: string | null; instagram_handle: string | null; business_email: string | null; business_whatsapp: string | null; permanently_closed: boolean; not_needed: NotNeeded | null; added_by: string | null; created_at: string };
const NN = [["subtype", "Kind"], ["instagram_handle", "Instagram handle"], ["business_email", "Business email"], ["business_whatsapp", "Business WhatsApp"]] as const;

export default function BusinessEdit() {
  const { supabase } = useAdmin();
  const [id] = useState(() => new URLSearchParams(window.location.search).get("id") ?? "");
  const [row, setRow] = useState<Row | null>(null);
  const [missing, setMissing] = useState(false);
  const [v, setV] = useState({ name: "", type: "restaurant" as BusinessType, kind: "", otherKind: "", instagram: "", email: "", whatsapp: "", closed: false, nn: {} as NotNeeded });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !id) return;
      const { data } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
      if (dead) return;
      if (!data) return setMissing(true);
      const r = data as Row;
      const known = KINDS[r.type].includes(r.subtype ?? "");
      setRow(r);
      setV({ name: r.name, type: r.type, kind: r.subtype ? (known ? r.subtype : r.type === "shop" ? OTHER_KIND : r.subtype) : "", otherKind: r.subtype && !known && r.type === "shop" ? r.subtype : "", instagram: r.instagram_handle ?? "", email: r.business_email ?? "", whatsapp: r.business_whatsapp ?? "", closed: r.permanently_closed, nn: r.not_needed ?? {} });
    })();
    return () => {
      dead = true;
    };
  }, [supabase, id, version]);

  if (!id || missing) return <p className="font-bold">That restaurant or shop was not found. <Link href="/admin/restaurants" className="underline">Back to the list</Link></p>;
  if (!row) return <p>Loading...</p>;

  const set = (k: keyof typeof v, value: string | boolean) => setV((o) => ({ ...o, [k]: value }));
  const markNN = (k: keyof NotNeeded, on: boolean) => setV((o) => ({ ...o, nn: { ...o.nn, [k]: on }, ...(on ? clear(k) : {}) }));
  const clear = (k: keyof NotNeeded) => (k === "subtype" ? { kind: "", otherKind: "" } : k === "instagram_handle" ? { instagram: "" } : k === "business_email" ? { email: "" } : { whatsapp: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = businessProblem({ ...v, instagram: v.instagram, email: v.email, whatsapp: v.whatsapp });
    if (p) return setMessage(p);
    setBusy(true);
    const { error } = await supabase!.from("businesses").update({
      name: v.name.trim(),
      type: v.type,
      subtype: kindToSave(v.type, v.kind, v.otherKind),
      instagram_handle: cleanHandle(v.instagram) || null,
      business_email: v.email.trim() || null,
      business_whatsapp: v.whatsapp.trim() || null,
      permanently_closed: v.closed,
      not_needed: Object.fromEntries(Object.entries(v.nn).filter(([, on]) => on === true)),
    }).eq("id", row!.id);
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage("Saved.");
    setVersion((n) => n + 1);
  }

  const complete = businessComplete({ subtype: kindToSave(v.type, v.kind, v.otherKind), instagram_handle: cleanHandle(v.instagram) || null, business_email: v.email.trim() || null, business_whatsapp: v.whatsapp.trim() || null, not_needed: v.nn });

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <form onSubmit={save} noValidate className="grid gap-4">
        <h1 className="text-4xl font-extrabold text-heading">Edit restaurant or shop</h1>
        <div className="rounded-2xl bg-panel p-4">
          <p className="text-sm font-bold text-ash">Code (for the team only, never changes)</p>
          <p className="break-all text-3xl font-extrabold tracking-widest text-heading">{row.code}</p>
          <p className="mt-1 text-sm text-ash">Added by {row.added_by ?? "-"} · {niceDateTime(row.created_at)}</p>
        </div>
        <div>
          <label htmlFor="be-name" className={label}>Name</label>
          <input id="be-name" className={field} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={160} />
        </div>
        <div>
          <label htmlFor="be-type" className={label}>Type</label>
          <select id="be-type" className={field} value={v.type} onChange={(e) => setV((o) => ({ ...o, type: e.target.value as BusinessType, kind: "", otherKind: "" }))}>
            <option value="restaurant">Restaurant (food or drink)</option>
            <option value="shop">Shop (not food)</option>
          </select>
        </div>
        <div>
          <label htmlFor="be-kind" className={label}>Kind</label>
          <select id="be-kind" className={field} value={v.kind} disabled={v.nn.subtype === true} onChange={(e) => set("kind", e.target.value)}>
            <option value="">Not chosen</option>
            {KINDS[v.type].map((k) => <option key={k} value={k}>{k}</option>)}
            {v.kind && !KINDS[v.type].includes(v.kind) && <option value={v.kind}>{v.kind}</option>}
          </select>
        </div>
        {v.type === "shop" && v.kind === OTHER_KIND && (
          <div>
            <label htmlFor="be-other" className={label}>What kind of shop?</label>
            <input id="be-other" className={field} value={v.otherKind} onChange={(e) => set("otherKind", e.target.value)} maxLength={80} />
          </div>
        )}
        <div>
          <label htmlFor="be-ig" className={label}>Instagram handle (business only)</label>
          <input id="be-ig" className={field} value={v.instagram} disabled={v.nn.instagram_handle === true} onChange={(e) => set("instagram", e.target.value)} autoCapitalize="none" />
        </div>
        <div>
          <label htmlFor="be-email" className={label}>Business email (business only)</label>
          <input id="be-email" type="email" className={field} value={v.email} disabled={v.nn.business_email === true} onChange={(e) => set("email", e.target.value)} autoCapitalize="none" />
        </div>
        <div>
          <label htmlFor="be-wa" className={label}>Business WhatsApp (business only)</label>
          <input id="be-wa" type="tel" className={field} value={v.whatsapp} disabled={v.nn.business_whatsapp === true} onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <fieldset className="grid gap-2 rounded-2xl bg-alt p-4">
          <legend className="font-extrabold">Not needed</legend>
          <p className="text-sm font-bold">Tick a detail this place does not have. It then counts as done, and the box is emptied.</p>
          {NN.map(([k, text]) => (
            <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
              <input type="checkbox" className="size-6" checked={v.nn[k] === true} onChange={(e) => markNN(k, e.target.checked)} />
              {text} is not needed
            </label>
          ))}
        </fieldset>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
          <input type="checkbox" className="size-6" checked={v.closed} onChange={(e) => set("closed", e.target.checked)} />
          Permanently closed
        </label>
        <p className="font-bold">{complete ? "This place is complete." : "Not complete yet: a detail is empty and not marked as not needed."}</p>
        {message && <p role="status" className="font-bold text-heading">{message}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="submit" disabled={busy} className={primary}>{busy ? "Saving" : "Save"}</button>
          <Link href="/admin/restaurants" className={outline}>Back to the list</Link>
        </div>
      </form>
      <ChangeHistory rowId={row.id} version={version} />
    </div>
  );
}
