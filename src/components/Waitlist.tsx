"use client";

import { useState } from "react";
import { FEATURES } from "@/config/features";

// Waitlist email form ("Notify me").
// The email is sent to the address in NEXT_PUBLIC_WAITLIST_URL (.env.local). That can be any
// form service that accepts a JSON POST (for example Formspree). If it is empty, the form
// says honestly that sign-up is not open yet. It never pretends to save an email.
type State = "idle" | "invalid" | "sending" | "done" | "failed" | "closed";

// list: which list the email goes on ("visitors" by default, "careers" for the careers page).
export default function Waitlist({ label = "Join the waitlist", list = "visitors" }: { label?: string; list?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  if (!FEATURES.waitlist) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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
        body: JSON.stringify({ list, email: email.trim() }),
      });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl bg-lilac px-5 py-4 text-center font-bold text-deep">
        Thank you. We will let you know when Spotted opens.
      </p>
    );
  }

  const message =
    state === "invalid"
      ? "Please enter a valid email."
      : state === "failed"
        ? "Something went wrong. Please try again."
        : state === "closed"
          ? "Sign-up is not open yet. Please check back soon."
          : "";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor={`waitlist-${label}`} className="sr-only">
        Your email address
      </label>
      <input
        id={`waitlist-${label}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state !== "sending") setState("idle");
        }}
        aria-invalid={state === "invalid"}
        className="min-h-12 flex-1 rounded-full bg-white px-5 text-base font-medium text-ink outline-none focus:ring-4 focus:ring-lilac"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-12 rounded-full bg-white px-7 font-extrabold text-deep transition active:scale-95 disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : label}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold text-white sm:basis-full">
          {message}
        </p>
      )}
    </form>
  );
}
