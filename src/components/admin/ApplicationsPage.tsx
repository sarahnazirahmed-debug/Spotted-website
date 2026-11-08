"use client";

// /admin/applications (main admin and associates only): the applications people sent from the Apply page,
// newest first. Open one to read every answer, open the private PDFs (a link that works for one minute),
// and mark it Approved or Declined. Also: make Founding Insider invite codes (each works once).
// The website only decides what to show. The database refuses anyone who is not allowed
// (supabase/applications.sql): staff and helpers get nothing, and no PDF is ever public.
import { useCallback, useEffect, useState } from "react";
import { canOpenApplications } from "@/lib/teamRules";
import { useAdmin } from "./AdminProvider";

type App = {
  id: string; kind: "insider" | "partner"; status: "New" | "Approved" | "Declined"; created_at: string; decided_at: string | null; decided_by: string | null;
  contact_name: string; email: string; phone: string; instagram: string | null; join_type: string | null; date_of_birth: string | null;
  profile_link: string | null; tiktok: string | null; youtube_link: string | null; snapchat: string | null; other_platform_name: string | null; other_platform_link: string | null;
  business_name: string | null; business_type: string | null; website: string | null; emirate: string | null; branches: number | null; plan_interest: string | null;
  advertiser_permit_path: string | null; trade_licence_path: string | null; food_permit_path: string | null;
};
type Member = { id: string; email: string; kind: "insider" | "partner"; founding: boolean; status: "active" | "paused"; approved_at: string; free_until: string; paid_until: string | null };
type Code = { id: string; code: string; note: string | null; created_by: string | null; created_at: string; used_at: string | null };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const field = "min-h-11 rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const ageOf = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a -= 1;
  return a;
};

export default function ApplicationsPage() {
  const { supabase, me } = useAdmin();
  const [apps, setApps] = useState<App[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [months, setMonths] = useState<Record<string, string>>({});   // typed free months: per Founding application, and per member
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "New" | "Approved" | "Declined">("New");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!supabase) return null;
    const [a, c, m] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("member_access").select("*").order("approved_at", { ascending: false }),
    ]);
    return { apps: (a.data as App[]) ?? [], codes: (c.data as Code[]) ?? [], members: (m.data as Member[]) ?? [] };
  }, [supabase]);
  const apply = (d: { apps: App[]; codes: Code[]; members: Member[] } | null) => {
    if (!d) return;
    setApps(d.apps);
    setCodes(d.codes);
    setMembers(d.members);
    setLoaded(true);
  };
  const load = async () => apply(await fetchAll());
  useEffect(() => {
    let dead = false;
    void fetchAll().then((d) => {
      if (!dead) apply(d);
    });
    return () => {
      dead = true;
    };
  }, [fetchAll]);

  if (!canOpenApplications(me?.role ?? null)) return <p className="text-lg">Your role cannot open Applications.</p>;

  async function setStatus(a: App, status: App["status"]) {
    // A Founding Insider needs the free months typed for that person before approving.
    const founding = a.join_type === "founding" && status === "Approved";
    let update: Record<string, unknown> = { status };
    if (founding) {
      const m = Number(months[a.id]);
      if (!Number.isInteger(m) || m < 1 || m > 36) return setMessage("Please type the free months for this Founding Insider (1 to 36) before you approve.");
      update = { status, founding_free_months: m };
    }
    const { error } = await supabase!.from("applications").update(update).eq("id", a.id);
    setMessage(
      error
        ? error.message.includes("different kind") ? "This email already has a different kind of account." : "The database did not allow that."
        : status === "Approved" ? `${a.business_name || a.contact_name} is approved. They can log in now with their email and a 6-digit code.` : `${a.business_name || a.contact_name} is now ${status}.`,
    );
    await load();
  }

  async function saveFreePeriod(m: Member) {
    const n = Number(months[m.id]);
    if (!Number.isInteger(n) || n < 0 || n > 36) return setMessage("Please type the free months as a number from 0 to 36.");
    const { error } = await supabase!.rpc("set_free_period", { p_member: m.id, p_months: n });
    setMessage(error ? "The database did not allow that." : `The free period of ${m.email} now ends ${n} months after the approval day.`);
    await load();
  }

  // A private PDF: a link that works for one minute only.
  async function openPdf(path: string) {
    const { data, error } = await supabase!.storage.from("applications").createSignedUrl(path, 60);
    if (error || !data) return setMessage("Could not open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function makeCode() {
    const { data, error } = await supabase!.rpc("create_invite_code", { p_note: note });
    setMessage(error ? "The database did not allow that." : `New invite code: ${data}. Give it to one Founding Insider. It works once.`);
    setNote("");
    await load();
  }

  const shown = apps.filter((a) => filter === "All" || a.status === filter);
  const row = (k: string, v: React.ReactNode) =>
    v === null || v === undefined || v === "" ? null : (
      <div className="grid gap-1 sm:grid-cols-[12rem_1fr]">
        <dt className="text-sm font-bold text-mist">{k}</dt>
        <dd className="break-words font-bold">{v}</dd>
      </div>
    );
  const pdf = (label: string, path: string | null) =>
    path ? (
      <button type="button" onClick={() => openPdf(path)} className="min-h-11 rounded-full border-2 border-line px-4 font-extrabold">
        Open {label}
      </button>
    ) : null;

  return (
    <div className="grid gap-10">
      <section>
        <h1 className="text-3xl font-extrabold text-heading">Applications</h1>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Show">
          {(["New", "Approved", "Declined", "All"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-11 rounded-full px-5 font-extrabold ${filter === f ? "bg-accent text-onaccent" : "border-2 border-line text-heading"}`}
            >
              {f}
              {f !== "All" && ` (${apps.filter((a) => a.status === f).length})`}
            </button>
          ))}
        </div>
        {message && (
          <p role="status" className="mt-3 rounded-xl bg-alt p-3 font-bold">
            {message}
          </p>
        )}
        <ul className="mt-4 grid gap-3">
          {shown.map((a) => (
            <li key={a.id} className="rounded-2xl bg-box p-4 text-onpanel">
              <button type="button" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 text-left">
                <span>
                  <span className="text-lg font-extrabold">{a.business_name || a.contact_name}</span>
                  <span className="ml-2 rounded-full bg-chip px-3 py-0.5 text-xs font-extrabold text-onchip">{a.kind === "insider" ? (a.join_type === "founding" ? "Founding Insider" : "Insider") : "Partner"}</span>
                </span>
                <span className="text-sm font-bold">
                  {a.status} <span className="font-medium text-mist">{when(a.created_at)}</span>
                </span>
              </button>
              {open === a.id && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4">
                  <dl className="grid gap-2">
                    {row("Name", a.contact_name)}
                    {row("Business", a.business_name)}
                    {row("Kind", a.business_type)}
                    {row("Email", a.email)}
                    {row("Phone / WhatsApp", a.phone)}
                    {row("Date of birth", a.date_of_birth ? `${a.date_of_birth} (age ${ageOf(a.date_of_birth)})` : null)}
                    {row("Main profile", a.profile_link)}
                    {row("Instagram", a.instagram && `@${a.instagram}`)}
                    {row("TikTok", a.tiktok && `@${a.tiktok}`)}
                    {row("YouTube", a.youtube_link)}
                    {row("Snapchat", a.snapchat && `@${a.snapchat}`)}
                    {row("Another platform", a.other_platform_name && `${a.other_platform_name}: ${a.other_platform_link ?? ""}`)}
                    {row("Website", a.website)}
                    {row("Emirate", a.emirate)}
                    {row("Branches", a.branches)}
                    {row("Plan", a.plan_interest)}
                    {row("Decided", a.decided_at ? `${a.status} by ${a.decided_by ?? "?"}, ${when(a.decided_at)}` : null)}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {pdf("Advertiser Permit (PDF)", a.advertiser_permit_path)}
                    {pdf("trade licence (PDF)", a.trade_licence_path)}
                    {pdf("food permit (PDF)", a.food_permit_path)}
                  </div>
                  {a.join_type === "founding" && a.status !== "Approved" && (
                    <label className="grid max-w-xs gap-1 text-sm font-bold">
                      Free months for this Founding Insider (you decide, per person)
                      <input type="number" min={1} max={36} className={field} value={months[a.id] ?? ""} onChange={(e) => setMonths({ ...months, [a.id]: e.target.value })} />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={a.status === "Approved"} onClick={() => setStatus(a, "Approved")} className="min-h-11 rounded-full bg-accent px-6 font-extrabold text-onaccent disabled:opacity-50">
                      Approve
                    </button>
                    <button type="button" disabled={a.status === "Declined"} onClick={() => setStatus(a, "Declined")} className="min-h-11 rounded-full border-2 border-line px-6 font-extrabold disabled:opacity-50">
                      Decline
                    </button>
                    {a.status !== "New" && (
                      <button type="button" onClick={() => setStatus(a, "New")} className="min-h-11 rounded-full border-2 border-line px-6 font-extrabold">
                        Back to New
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {loaded && shown.length === 0 && <li className="text-lg">Nothing here yet.</li>}
          {!loaded && <li className="text-lg">Loading...</li>}
        </ul>
      </section>


      <section>
        <h2 className="text-2xl font-extrabold text-heading">Members</h2>
        <p className="mt-1">Approved Insiders and Partners. Access stops when the free period ends, unless they have paid. Nothing is deleted.</p>
        <ul className="mt-4 grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="grid gap-2 rounded-xl bg-alt p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="font-extrabold">{m.email}</span>{" "}
                <span className="text-sm">({m.kind === "insider" ? (m.founding ? "Founding Insider" : "Insider") : "Partner"}{m.status === "paused" ? ", paused" : ""})</span>
                <span className="block text-sm">
                  Free until {when(m.free_until)}
                  {m.paid_until ? `, paid until ${when(m.paid_until)}` : ""}
                  {new Date(m.free_until) < new Date() && !(m.paid_until && new Date(m.paid_until) > new Date()) ? " - access has stopped" : ""}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <input aria-label={`Free months for ${m.email}`} type="number" min={0} max={36} placeholder="Free months" className={`${field} w-32`} value={months[m.id] ?? ""} onChange={(e) => setMonths({ ...months, [m.id]: e.target.value })} />
                <button type="button" onClick={() => saveFreePeriod(m)} className="min-h-11 rounded-full border-2 border-line px-4 font-extrabold">
                  Save free period
                </button>
              </span>
            </li>
          ))}
          {loaded && members.length === 0 && <li className="text-sm">Nobody is approved yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold text-heading">Founding Insider invite codes</h2>
        <p className="mt-1">Each code works once. Give it to one person you invited.</p>
        <div className="mt-4 flex max-w-2xl flex-wrap gap-3">
          <input aria-label="Who is it for (your own note)" placeholder="Who is it for? (your own note)" className={`${field} flex-1`} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" onClick={makeCode} className="min-h-11 rounded-full bg-accent px-6 font-extrabold text-onaccent">
            Make a code
          </button>
        </div>
        <ul className="mt-4 grid gap-2">
          {codes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-alt p-3">
              <span>
                <span className="font-mono text-lg font-extrabold tracking-widest">{c.code}</span>
                {c.note && <span className="ml-3 text-sm">{c.note}</span>}
              </span>
              <span className="text-sm font-bold">{c.used_at ? `Used ${when(c.used_at)}` : "Not used yet"}</span>
            </li>
          ))}
          {loaded && codes.length === 0 && <li className="text-sm">No codes yet.</li>}
        </ul>
      </section>
    </div>
  );
}
