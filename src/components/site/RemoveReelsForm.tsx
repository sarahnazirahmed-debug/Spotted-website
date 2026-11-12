"use client";

// "Creators: remove my reels". Saved in Supabase (table removal_requests) so the team can act on it.
import { useState } from "react";
import { text } from "@/content";
import { getSupabase } from "@/lib/supabase";
import { isEmail } from "@/lib/signupRules";

type State = "idle" | "invalid" | "sending" | "done" | "failed" | "closed";
const field = "min-h-12 w-full rounded-2xl bg-paper px-5 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";

export default function RemoveReelsForm() {
  const t = text.removeReels;
  const [state, setState] = useState<State>("idle");
  const [v, setV] = useState({ name: "", handles: "", links: "", email: "", website: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    if (state !== "sending") setState("idle");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.handles.trim() || !isEmail(v.email)) return setState("invalid");
    if (v.website) return setState("done"); // robot trap
    const supabase = getSupabase();
    if (!supabase) return setState("closed");
    setState("sending");
    const { error } = await supabase.from("removal_requests").insert({
      name: v.name.trim() || null,
      handles: v.handles.trim(),
      links: v.links.trim() || null,
      email: v.email.trim(),
    });
    setState(error ? "failed" : "done");
  }

  if (state === "done")
    return (
      <p role="status" className="rounded-2xl bg-chip px-5 py-4 font-bold text-onchip">
        {t.done}
      </p>
    );
  const message = state === "invalid" ? t.invalid : state === "failed" ? t.failed : state === "closed" ? t.closed : "";
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div>
        <label htmlFor="rm-name" className={label}>{t.name}</label>
        <input id="rm-name" className={field} value={v.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="rm-handles" className={label}>{t.handles}</label>
        <input id="rm-handles" className={field} value={v.handles} onChange={set("handles")} autoCapitalize="none" />
      </div>
      <div>
        <label htmlFor="rm-links" className={label}>{t.links}</label>
        <textarea id="rm-links" rows={4} className={`${field} py-3`} value={v.links} onChange={set("links")} />
      </div>
      <div>
        <label htmlFor="rm-email" className={label}>{t.email}</label>
        <input id="rm-email" type="email" inputMode="email" className={field} value={v.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
        </label>
      </div>
      <button type="submit" disabled={state === "sending"} className="min-h-12 rounded-full bg-accent px-7 font-extrabold text-onaccent transition motion-safe:active:scale-95 disabled:opacity-60">
        {state === "sending" ? t.sending : t.submit}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold">
          {message}
        </p>
      )}
    </form>
  );
}
