"use client";

// THE ONE LOG IN PAGE for everybody: owners, crew, Insiders and Partners.
//   1. Type your email -> we send a 6-digit code (no passwords anywhere).
//   2. Type the code -> we look the email up in the database and send you to the right place
//      (see src/lib/loginRoute.ts): team -> /admin, Insider -> /dashboard/insider, Partner -> /dashboard.
//   3. An email we do not know gets a polite message.
// The log-in is first made on the "in memory" connection used by /admin. Team members stay on it, so
// nothing about them is saved on the computer. Insiders and Partners are handed to the normal
// connection, which remembers them so their dashboard stays open.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSupabase } from "@/lib/adminSupabase";
import { getSupabase } from "@/lib/supabase";
import { isEmail } from "@/lib/signupRules";
import { destinationFor, type PartnerKind } from "@/lib/loginRoute";
import { partnerLink } from "@/config/routes";
import { text } from "@/content";

const t = text.login;
const field =
  "min-h-12 w-full rounded-2xl bg-paper px-5 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";
const label = "mb-1 block text-sm font-bold text-paper";
const primary =
  "min-h-12 w-full rounded-full bg-accent px-7 font-extrabold text-onaccent transition active:scale-95 disabled:opacity-60";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "unknown">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!isEmail(email)) return setMessage(t.badEmail);
    const supabase = getAdminSupabase();
    if (!supabase) return setMessage(t.closed);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setMessage(t.cannotSend);
    setMessage("");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setMessage(t.badCode);
    const supabase = getAdminSupabase();
    if (!supabase) return setMessage(t.closed);
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    if (error || !data.session) {
      setBusy(false);
      return setMessage(t.wrongCode);
    }

    // Who is this? The database decides.
    const { data: who, error: whoError } = await supabase.rpc("whoami");
    if (whoError) {
      setBusy(false);
      return setMessage(t.problem);
    }
    const team = (Array.isArray(who) ? who[0] : who) != null;
    let kind: PartnerKind = null;
    if (!team) {
      const { data: partner } = await supabase.from("partner_accounts").select("kind").maybeSingle();
      kind = (partner?.kind as PartnerKind) ?? null;
    }

    const to = destinationFor(team, kind);
    if (!to) {
      await supabase.auth.signOut();
      setBusy(false);
      setCode("");
      setMessage("");
      return setStep("unknown");
    }
    if (!team) {
      // Insiders and Partners: hand the log-in to the normal connection so their dashboard remembers them.
      await getSupabase()?.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      await supabase.auth.signOut({ scope: "local" });
    }
    router.push(to);
  }

  if (step === "unknown") {
    return (
      <div className="grid gap-4 text-center">
        <p role="alert" className="text-lg font-bold text-paper">
          {t.unknown}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={partnerLink("insider")} className="flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-extrabold text-onaccent">
            {t.applyInsider}
          </Link>
          <Link href={partnerLink("restaurants")} className="flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-extrabold text-onaccent">
            {t.applyPartner}
          </Link>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} noValidate className="grid gap-4">
        <p className="text-lg text-mist">
          {t.codeSent} <strong className="text-paper">{email.trim()}</strong>.
        </p>
        <div>
          <label htmlFor="login-code" className={label}>
            {t.codeLabel}
          </label>
          <input
            id="login-code"
            className={`${field} text-center text-2xl tracking-[0.3em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setMessage("");
            }}
            autoFocus
          />
        </div>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? t.checking : t.check}
        </button>
        <button type="button" onClick={() => sendCode()} disabled={busy} className="min-h-11 font-bold text-paper underline">
          {t.newCode}
        </button>
        {message && (
          <p role="alert" className="text-sm font-bold text-paper">
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate className="grid gap-4 text-left">
      <div>
        <label htmlFor="login-email" className={label}>
          {t.emailLabel}
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          className={field}
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage("");
          }}
          autoComplete="email"
          autoFocus
        />
      </div>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? t.sending : t.send}
      </button>
      {message && (
        <p role="alert" className="text-sm font-bold text-paper">
          {message}
        </p>
      )}
    </form>
  );
}
