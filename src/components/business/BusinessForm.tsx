"use client";

// "Join the waitlist" form for restaurants and shops: business name, type, area, email or WhatsApp number.
// Like the visitor waitlist, it posts to NEXT_PUBLIC_WAITLIST_URL and says honestly if that is not set.
import { useState } from "react";
import type { Kind } from "./data";
import { COPY } from "./copy";

type State = "idle" | "invalid" | "sending" | "done" | "failed" | "closed";

const field =
  "min-h-12 w-full rounded-2xl bg-white px-5 text-base font-medium text-ink outline-none focus:ring-4 focus:ring-lilac";
const label = "mb-1 block text-sm font-bold text-white";

export default function BusinessForm({ kind }: { kind: Kind }) {
  const c = COPY[kind];
  const [state, setState] = useState<State>("idle");
  const [v, setV] = useState({ name: "", type: c.types[0], area: "", contact: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    if (state !== "sending") setState("idle");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contact = v.contact.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = contact.replace(/\D/g, "").length >= 7 && /^\+?[0-9 ()-]+$/.test(contact);
    if (!v.name.trim() || !v.area.trim() || !(isEmail || isPhone)) {
      setState("invalid");
      return;
    }
    const url = process.env.NEXT_PUBLIC_WAITLIST_URL;
    if (!url) {
      setState("closed");
      return;
    }
    setState("sending");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          list: "business",
          kind,
          businessName: v.name.trim(),
          businessType: v.type,
          area: v.area.trim(),
          contact,
        }),
      });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl bg-lilac px-5 py-4 text-center font-bold text-deep">
        Thank you. We will get in touch before Spotted opens.
      </p>
    );
  }

  const message =
    state === "invalid"
      ? "Please fill in every box, with a valid email or WhatsApp number."
      : state === "failed"
        ? "Something went wrong. Please try again."
        : state === "closed"
          ? "Sign-up is not open yet. Please check back soon."
          : "";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 text-left sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="biz-name" className={label}>
          Business name
        </label>
        <input id="biz-name" className={field} placeholder={c.namePlaceholder} value={v.name} onChange={set("name")} autoComplete="organization" />
      </div>
      <div>
        <label htmlFor="biz-type" className={label}>
          Type
        </label>
        <select id="biz-type" className={field} value={v.type} onChange={set("type")}>
          {c.types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="biz-area" className={label}>
          Area
        </label>
        <input id="biz-area" className={field} placeholder="Khalifa City" value={v.area} onChange={set("area")} autoComplete="address-level2" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="biz-contact" className={label}>
          Email or WhatsApp number
        </label>
        <input id="biz-contact" className={field} placeholder="you@email.com or +971 50 000 0000" value={v.contact} onChange={set("contact")} autoComplete="email" />
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-12 rounded-full bg-white px-7 font-extrabold text-deep transition active:scale-95 disabled:opacity-60 sm:col-span-2"
      >
        {state === "sending" ? "Sending..." : "Join the waitlist"}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold text-white sm:col-span-2">
          {message}
        </p>
      )}
    </form>
  );
}
