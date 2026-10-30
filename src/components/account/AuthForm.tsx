"use client";

// Sign up and log in, both with a one-time code sent by email (Supabase, free).
//   Sign up: name, email, phone / WhatsApp number (optional), birthday (optional) -> code -> thank-you.
//   Log in:  email -> code -> partners go to their dashboard, everyone else sees "Spotted works in the app".
// If Supabase is not connected yet (empty settings in .env.local), the form says so honestly.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LAUNCH } from "@/config/features";
import { getSupabase } from "@/lib/supabase";
import { birthdayProblem, isCode, isEmail, isPhone } from "@/lib/signupRules";

type Step = "form" | "code" | "thanks" | "inApp";

const field =
  "min-h-12 w-full rounded-2xl bg-white px-5 text-base font-medium text-ink outline-none focus:ring-4 focus:ring-lilac";
const label = "mb-1 block text-sm font-bold text-white";
const primary =
  "min-h-12 w-full rounded-full bg-white px-7 font-extrabold text-deep transition active:scale-95 disabled:opacity-60";

function StoreButtons() {
  const out = LAUNCH.status === "outNow";
  const btn = "flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-5 font-extrabold";
  const items: [string, string][] = [
    ["App Store", LAUNCH.stores.appStore],
    ["Google Play", LAUNCH.stores.googlePlay],
  ];
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      {items.map(([name, href]) =>
        out && href ? (
          <a key={name} href={href} className={`${btn} bg-white text-deep`}>
            {name}
          </a>
        ) : (
          <span key={name} aria-disabled="true" className={`${btn} bg-white/20 text-white`}>
            {name}
            <span className="text-xs font-bold text-lilac">{LAUNCH.storeNote}</span>
          </span>
        ),
      )}
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [v, setV] = useState({ name: "", email: "", phone: "", birthday: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    setMessage("");
  };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const email = v.email.trim();
    if (!isEmail(email)) return setMessage("Please enter a valid email.");
    if (mode === "signup") {
      if (!v.name.trim()) return setMessage("Please tell us your name.");
      if (v.phone.trim() && !isPhone(v.phone)) return setMessage("Please check your phone or WhatsApp number.");
      const bad = birthdayProblem(v.birthday);
      if (bad) return setMessage(bad);
    }
    const supabase = getSupabase();
    if (!supabase) return setMessage("Sign-up is not open yet. Please check back soon.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options:
        mode === "signup"
          ? {
              shouldCreateUser: true,
              // These are copied into the person's profile by the database (see schema.sql).
              data: { name: v.name.trim(), phone: v.phone.trim(), birthday: v.birthday },
            }
          : { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      return setMessage(
        mode === "login" ? "We could not find that email. Please sign up first, or check the spelling." : "We could not send the code. Please try again.",
      );
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!isCode(v.code)) return setMessage("The code has 6 to 8 numbers. Please check your email.");
    const supabase = getSupabase();
    if (!supabase) return setMessage("Sign-up is not open yet. Please check back soon.");
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: v.email.trim(), token: v.code.trim(), type: "email" });
    if (error || !data.user) {
      setBusy(false);
      return setMessage("That code did not work. Please check it, or ask for a new one.");
    }
    if (mode === "signup") {
      setBusy(false);
      return setStep("thanks");
    }
    // Log in: partners go to their dashboard. Everyone else is told to use the app.
    const { data: partner } = await supabase.from("partner_accounts").select("id").maybeSingle();
    setBusy(false);
    if (partner) router.push("/dashboard");
    else setStep("inApp");
  }

  if (step === "thanks") {
    return (
      <div className="text-center">
        <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Your account is ready.</h2>
        <p className="mt-3 text-xl font-bold text-lilac">Use Spotted in the app.</p>
        <StoreButtons />
      </div>
    );
  }
  if (step === "inApp") {
    return (
      <div className="text-center">
        <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Spotted works in the app.</h2>
        <p className="mt-3 text-lg text-lilac">Save places from reels and get a nudge when you are near.</p>
        <StoreButtons />
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} noValidate className="grid gap-4">
        <p className="text-lg text-lilac">
          We sent a code to <strong className="text-white">{v.email.trim()}</strong>. Type it here.
        </p>
        <div>
          <label htmlFor="auth-code" className={label}>
            One-time code
          </label>
          <input
            id="auth-code"
            className={`${field} text-center text-2xl tracking-[0.3em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={v.code}
            onChange={set("code")}
            autoFocus
          />
        </div>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Checking..." : mode === "signup" ? "Finish sign up" : "Log in"}
        </button>
        <button type="button" onClick={() => sendCode()} disabled={busy} className="min-h-11 font-bold text-white underline">
          Send a new code
        </button>
        {message && (
          <p role="alert" className="text-sm font-bold text-white">
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate className="grid gap-4 text-left">
      {mode === "signup" && (
        <div>
          <label htmlFor="auth-name" className={label}>
            Name
          </label>
          <input id="auth-name" className={field} value={v.name} onChange={set("name")} autoComplete="name" />
        </div>
      )}
      <div>
        <label htmlFor="auth-email" className={label}>
          Email
        </label>
        <input id="auth-email" type="email" inputMode="email" className={field} placeholder="you@email.com" value={v.email} onChange={set("email")} autoComplete="email" />
      </div>
      {mode === "signup" && (
        <>
          <div>
            <label htmlFor="auth-phone" className={label}>
              Phone or WhatsApp number (optional)
            </label>
            <input id="auth-phone" type="tel" inputMode="tel" className={field} placeholder="+971 50 000 0000" value={v.phone} onChange={set("phone")} autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="auth-birthday" className={label}>
              Birthday (optional, for birthday treats)
            </label>
            <input id="auth-birthday" type="date" className={field} value={v.birthday} onChange={set("birthday")} autoComplete="bday" />
          </div>
        </>
      )}
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Sending..." : "Send me a code"}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold text-white">
          {message}
        </p>
      )}
    </form>
  );
}
