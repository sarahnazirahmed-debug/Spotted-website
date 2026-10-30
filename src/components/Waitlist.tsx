"use client";

import { useState } from "react";
import { FEATURES } from "@/config/features";

// Waitlist email form.
// NOTE: Version 1 has no server, so the email is checked but NOT saved anywhere yet.
// Before the site goes public, connect this to a real service (see onSubmit below).
export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("error");
      return;
    }
    // TODO: send `email` to a real waitlist service here.
    setState("done");
  }

  if (!FEATURES.waitlist) return null;

  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl bg-sun px-5 py-4 text-center font-bold text-deep">
        You are on the list. See you on 1 January.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="waitlist-email" className="sr-only">
        Your email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        aria-invalid={state === "error"}
        className="min-h-12 flex-1 rounded-full bg-white px-5 text-base font-medium text-ink outline-none focus:ring-4 focus:ring-lilac"
      />
      <button
        type="submit"
        className="min-h-12 rounded-full bg-sun px-7 font-extrabold text-deep transition active:scale-95"
      >
        Join the waitlist
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm font-bold text-white sm:hidden">
          Please enter a valid email.
        </p>
      )}
    </form>
  );
}
