"use client";

// Creator waitlist: name, Instagram / TikTok / YouTube handles (at least one), and email.
// Posts to NEXT_PUBLIC_WAITLIST_URL like the other forms, and says honestly if that is not set.
import { useState } from "react";

type State = "idle" | "invalid" | "sending" | "done" | "failed" | "closed";
const field =
  "min-h-12 w-full rounded-2xl bg-white px-5 text-base font-medium text-ink outline-none focus:ring-4 focus:ring-lilac";
const label = "mb-1 block text-sm font-bold text-white";
const clean = (h: string) => h.trim().replace(/^@+/, "");

export default function CreatorForm() {
  const [state, setState] = useState<State>("idle");
  const [v, setV] = useState({ name: "", instagram: "", tiktok: "", youtube: "", email: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    if (state !== "sending") setState("idle");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasHandle = [v.instagram, v.tiktok, v.youtube].some((h) => clean(h));
    if (!v.name.trim() || !hasHandle || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
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
          list: "creators",
          name: v.name.trim(),
          instagram: clean(v.instagram),
          tiktok: clean(v.tiktok),
          youtube: clean(v.youtube),
          email: v.email.trim(),
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
        Thank you. We will be in touch before Spotted opens.
      </p>
    );
  }
  const message =
    state === "invalid"
      ? "Please add your name, a valid email, and at least one handle."
      : state === "failed"
        ? "Something went wrong. Please try again."
        : state === "closed"
          ? "Sign-up is not open yet. Please check back soon."
          : "";

  const input = (id: keyof typeof v, text: string, placeholder: string, extra = "") => (
    <div className={extra}>
      <label htmlFor={`cr-${id}`} className={label}>
        {text}
      </label>
      <input
        id={`cr-${id}`}
        className={field}
        placeholder={placeholder}
        value={v[id]}
        onChange={set(id)}
        type={id === "email" ? "email" : "text"}
        autoComplete={id === "email" ? "email" : id === "name" ? "name" : "off"}
        autoCapitalize="none"
      />
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 text-left sm:grid-cols-2">
      {input("name", "Your name", "Your name", "sm:col-span-2")}
      {input("instagram", "Instagram handle", "@yourhandle")}
      {input("tiktok", "TikTok handle", "@yourhandle")}
      {input("youtube", "YouTube handle", "@yourchannel")}
      {input("email", "Email", "you@email.com")}
      <p className="text-sm text-lilac sm:col-span-2">Add at least one handle.</p>
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-12 rounded-full bg-white px-7 font-extrabold text-deep transition active:scale-95 disabled:opacity-60 sm:col-span-2"
      >
        {state === "sending" ? "Sending..." : "Join the creator waitlist"}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold text-white sm:col-span-2">
          {message}
        </p>
      )}
    </form>
  );
}
