"use client";

// The "Get in touch" form on the Restaurants, Shops and Insiders pages.
// It saves the request in Supabase (table contact_requests) so you can contact the person.
// Nobody on the website can read the requests back: only the main admin and associates can.
import { useState } from "react";
import { text } from "@/content";
import { getSupabase } from "@/lib/supabase";
import { isEmail, isPhone } from "@/lib/signupRules";

type Kind = "restaurant" | "shop" | "insider";
type State = "idle" | "invalid" | "sending" | "done" | "failed" | "closed";

const field = "min-h-12 w-full rounded-2xl bg-paper px-5 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold";

export default function ContactForm({ kind, businessLabel }: { kind: Kind; businessLabel: string }) {
  const t = text.form;
  const [state, setState] = useState<State>("idle");
  const [v, setV] = useState({ name: "", business: "", phone: "", email: "", website: "" }); // "website" is a trap for robots
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    if (state !== "sending") setState("idle");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phone = v.phone.trim();
    const email = v.email.trim();
    const phoneOk = phone !== "" && isPhone(phone);
    const emailOk = email !== "" && isEmail(email);
    const businessNeeded = kind !== "insider";
    if (!v.name.trim() || (businessNeeded && !v.business.trim()) || !(phoneOk || emailOk) || (phone && !phoneOk) || (email && !emailOk)) {
      return setState("invalid");
    }
    if (v.website) return setState("done"); // a robot filled the hidden box: pretend it worked
    const supabase = getSupabase();
    if (!supabase) return setState("closed");
    setState("sending");
    const { error } = await supabase.from("contact_requests").insert({
      kind,
      name: v.name.trim(),
      business: v.business.trim() || null,
      phone: phone || null,
      email: email || null,
    });
    setState(error ? "failed" : "done");
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl bg-chip px-5 py-4 text-center font-bold text-onchip">
        {t.done}
      </p>
    );
  }
  const message = state === "invalid" ? t.invalid : state === "failed" ? t.failed : state === "closed" ? t.closed : "";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 text-left sm:grid-cols-2">
      <div>
        <label htmlFor={`gt-name-${kind}`} className={label}>{t.name}</label>
        <input id={`gt-name-${kind}`} className={field} value={v.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div>
        <label htmlFor={`gt-business-${kind}`} className={label}>{businessLabel}</label>
        <input id={`gt-business-${kind}`} className={field} value={v.business} onChange={set("business")} autoComplete="organization" />
      </div>
      <div>
        <label htmlFor={`gt-phone-${kind}`} className={label}>{t.phone}</label>
        <input id={`gt-phone-${kind}`} type="tel" inputMode="tel" className={field} value={v.phone} onChange={set("phone")} autoComplete="tel" placeholder="+971 50 000 0000" />
      </div>
      <div>
        <label htmlFor={`gt-email-${kind}`} className={label}>{t.email}</label>
        <input id={`gt-email-${kind}`} type="email" inputMode="email" className={field} value={v.email} onChange={set("email")} autoComplete="email" />
      </div>
      {/* hidden trap for robots: people never see or fill this */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
        </label>
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-12 rounded-full bg-accent px-7 font-extrabold text-onaccent transition active:scale-95 disabled:opacity-60 sm:col-span-2"
      >
        {state === "sending" ? t.sending : t.submit}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold sm:col-span-2">
          {message}
        </p>
      )}
    </form>
  );
}
