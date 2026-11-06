"use client";

// /admin log-in: your email, then the 6-digit code we send you. Every time.
import { useState } from "react";
import { isEmail } from "@/lib/signupRules";
import { useAdmin } from "./AdminProvider";

const field = "min-h-12 w-full rounded-2xl bg-paper px-5 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const button = "min-h-12 w-full rounded-full bg-accent px-7 font-extrabold text-onaccent transition active:scale-95 disabled:opacity-60";

export default function AdminLogin() {
  const { sendCode, verify } = useAdmin();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return setMessage("Please enter a valid email.");
    setBusy(true);
    const problem = await sendCode(email);
    setBusy(false);
    if (problem) return setMessage(problem);
    setMessage("");
    setStep("code");
  }

  async function onCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setMessage("The code has 6 numbers. Please check your email.");
    setBusy(true);
    const problem = await verify(email, code);
    setBusy(false);
    if (problem) setMessage(problem);
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-3xl font-extrabold text-heading">Spotted team</h1>
      <p className="mt-2 text-lg">Log in with your email and a 6-digit code. We ask for a new code every time.</p>
      <div className="mt-8 rounded-3xl bg-panel p-6 text-onpanel">
        {step === "email" ? (
          <form onSubmit={onEmail} noValidate className="grid gap-4">
            <label htmlFor="admin-email" className="text-sm font-bold">
              Your email
            </label>
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className={field}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage("");
              }}
              autoFocus
            />
            <button type="submit" disabled={busy} className={button}>
              {busy ? "Sending..." : "Send me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={onCode} noValidate className="grid gap-4">
            <p>
              We sent a 6-digit code to <strong>{email.trim().toLowerCase()}</strong>.
            </p>
            <label htmlFor="admin-code" className="text-sm font-bold">
              6-digit code
            </label>
            <input
              id="admin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${field} text-center text-2xl tracking-[0.3em]`}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setMessage("");
              }}
              autoFocus
            />
            <button type="submit" disabled={busy} className={button}>
              {busy ? "Checking..." : "Log in"}
            </button>
            <button type="button" className="min-h-11 font-bold underline" onClick={() => { setStep("email"); setCode(""); setMessage(""); }}>
              Use a different email
            </button>
          </form>
        )}
        {message && (
          <p role="alert" className="mt-4 text-sm font-bold">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
