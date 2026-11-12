"use client";

// One email (or phone) with its "Send code" and "Enter the code" parts. A tick shows when the code was right.
// Email codes are real (src/lib/verification.ts). Phone codes are only shown when `smsVerification` is ON in features.ts.
import { useState } from "react";
import { checkEmail } from "@/lib/emailCheck";
import { checkEmailCode, sendEmailCode } from "@/lib/verification";
import { text } from "@/content";
import type { CodeState } from "@/lib/codeEntry";
import CodeEntry from "../code/CodeEntry";
import VerifyButton from "../code/VerifyButton";

const t = text.insiderForm;
const input = "min-h-12 w-full rounded-xl border border-rosesoft bg-card px-4 text-base text-darktext outline-none focus:border-maroonink focus:ring-4 focus:ring-coral/40";
const small = "min-h-11 rounded-full border border-maroonink px-5 text-sm font-bold text-maroonink hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-coral disabled:opacity-60";
const WORDS = { verify: "Verify", checking: "Checking", tryAgain: "Try again", verified: t.verifiedWord };

export default function CodeRow({ id, label, value, onChange, verified, onVerified, required = false }: {
  id: string; label: string; value: string; onChange: (v: string) => void; verified: boolean; onVerified: (value: string) => void; required?: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<CodeState>("waiting");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const check = checkEmail(value);

  async function send() {
    if (!check.ok) return setMessage(check.problem ?? "Please type the email first.");
    setBusy(true);
    const r = await sendEmailCode(value);
    setBusy(false);
    setMessage(r.message);
    if (r.ok) {
      setSent(true);
      setCode("");
      setStatus("waiting");
    }
  }
  async function verify() {
    if (code.length < 6) {
      setStatus("wrong");
      return setMessage("The code has 6 numbers.");
    }
    setStatus("checking");
    const r = await checkEmailCode(value, code);
    if (!r.ok) {
      setStatus("wrong");
      return setMessage(r.message);
    }
    setStatus("correct");
    setMessage("");
    onVerified(value);
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-rosesoft bg-card p-4">
      <label htmlFor={id} className="text-sm font-semibold">
        {label} {required ? <span className="text-mutedtext">(required)</span> : <span className="text-mutedtext">(optional)</span>}
      </label>
      <input id={id} type="email" inputMode="email" autoComplete="email" className={input} value={value} onChange={(e) => { onChange(e.target.value); setMessage(""); }} />
      {check.problem && <p role="alert" className="text-sm font-bold text-problem">{check.problem}</p>}
      {check.suggestion && value.trim() && (
        <p role="status" className="text-sm font-semibold">
          Did you mean <button type="button" className="font-bold text-maroonink underline" onClick={() => onChange(check.suggestion!)}>{check.suggestion.split("@")[1]}</button>?
        </p>
      )}
      {verified ? (
        <p role="status" className="flex min-h-11 items-center gap-2 font-bold text-maroonink">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
          {t.verifiedWord}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={small} disabled={busy || !value.trim()} onClick={send}>{t.sendCode}</button>
          </div>
          {sent && (
            // (a plain box, not a <form>: this row sits inside the step's form, and a form inside a form is not allowed)
            <div className="grid gap-3 rounded-xl bg-panel p-4 text-onpanel" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void verify(); } }}>
              <CodeEntry id={`${id}-code`} label={t.enterCode} value={code} state={status} onChange={(d) => { setCode(d); if (status === "wrong") setStatus("waiting"); }} />
              <VerifyButton state={status} words={WORDS} onPress={() => void verify()} />
            </div>
          )}
        </>
      )}
      {message && !check.problem && <p role="status" className="text-sm font-semibold text-mutedtext">{message}</p>}
    </div>
  );
}
