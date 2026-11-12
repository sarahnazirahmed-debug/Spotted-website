"use client";

// THE INSIDER APPLICATION IN 7 STEPS (a progress bar, one screen per step), then a review screen with 7 cards,
// the three tick boxes and the Submit button. When it is sent, the 7 cards fly into a bookmark, the bookmark drops and opens
// into the confirmation. With Reduce Motion the confirmation just appears.
// The rules are in src/lib/insiderForm.ts; the database checks everything again (supabase/apply_insider_form.sql).
// The Partner form is separate (ApplyForm.tsx).
import { useRef, useState } from "react";
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import { getSupabase } from "@/lib/supabase";
import { MAX_PDF_BYTES, pdfPath, pdfProblem } from "@/lib/applyRules";
import type { CodeState } from "@/lib/codeEntry";
import {
  COUNTRY, EMIRATES, MAX_AGENCY_ACCOUNTS, STEPS, buildPayload, emailVerified, emptyValues, firstBadStep, phoneVerified, stepProblem, summary,
  type StepId, type Values,
} from "@/lib/insiderForm";
import VerifyButton from "../code/VerifyButton";
import CodeRow from "./CodeRow";

const t = text.insiderForm;
const input = "min-h-12 w-full rounded-xl border border-rosesoft bg-card px-4 text-base text-darktext outline-none focus:border-maroonink focus:ring-4 focus:ring-coral/40";
const label = "mb-1 block text-sm font-semibold";
const primary = "inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-8 font-bar text-base font-bold text-oncoral transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-60";
const ghost = "inline-flex min-h-12 items-center justify-center rounded-full border border-maroonink px-7 font-bar text-base font-bold text-maroonink transition hover:bg-pinktint motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-coral";
const SUBMIT_WORDS = { verify: t.submit, checking: t.sending, tryAgain: t.tryAgain, verified: t.submitted };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Files = { permit: File | null; licence: File | null };

function Choice({ name, value, current, onPick, title, note }: { name: string; value: string; current: string; onPick: () => void; title: string; note?: string }) {
  const on = current === value;
  return (
    <label className={`flex min-h-16 cursor-pointer flex-col justify-center rounded-2xl border-2 p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coral ${on ? "border-maroonink bg-maroon text-cream" : "border-rosesoft bg-card text-darktext"}`}>
      <input type="radio" name={name} value={value} checked={on} onChange={onPick} className="sr-only" />
      <span className="font-bold">{title}</span>
      {note && <span className={`text-sm ${on ? "text-cream/90" : "text-mutedtext"}`}>{note}</span>}
    </label>
  );
}

function Field({ id, label: l, optional, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{l} {optional && <span className="font-normal text-mutedtext">(optional)</span>}</label>
      {children}
    </div>
  );
}

export default function InsiderWizard() {
  const [v, setV] = useState<Values>(emptyValues());
  const [step, setStep] = useState(0); // 0 to 6 = the seven steps, 7 = the review screen
  const [files, setFiles] = useState<Files>({ permit: null, licence: null });
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<CodeState>("waiting");
  const [phase, setPhase] = useState<"form" | "flying" | "done">("form");
  const cards = useRef<HTMLDivElement>(null);
  const bookmark = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLDivElement>(null);
  const smsOn = FEATURES.smsVerification;
  const set = <K extends keyof Values>(k: K, value: Values[K]) => { setV((o) => ({ ...o, [k]: value })); setMessage(""); };
  const ctx = { smsOn };
  const id: StepId | null = step < 7 ? STEPS[step] : null;

  function next(e?: React.FormEvent) {
    e?.preventDefault();
    if (!id) return;
    const p = stepProblem(id, v, ctx) ?? filesProblem(id);
    if (p) return setMessage(p);
    setMessage("");
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function filesProblem(s: StepId): string | null {
    if (s !== "documents") return null;
    if (!files.permit) return "Please add your UAE Advertiser Permit (PDF).";
    if (v.type === "agency" && !files.licence) return "Please add your UAE trade licence (PDF).";
    return null;
  }

  async function pick(kind: "permit" | "licence", file: File | null) {
    if (!file) return setFiles((f) => ({ ...f, [kind]: null }));
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const p = pdfProblem({ name: file.name, type: file.type, size: file.size }, head);
    if (p) return setMessage(p);
    setMessage("");
    setFiles((f) => ({ ...f, [kind]: file }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "checking" || status === "correct") return;
    const bad = firstBadStep(v, ctx) ?? (filesProblem("documents") ? "documents" : null);
    if (bad) {
      setStatus("wrong");
      setStep(STEPS.indexOf(bad));
      return setMessage(stepProblem(bad, v, ctx) ?? filesProblem(bad) ?? "");
    }
    if (!v.accepted.terms || !v.accepted.privacy || !v.accepted.confidentiality) {
      setStatus("wrong");
      return setMessage("Please tick all three boxes before you send.");
    }
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("wrong");
      return setMessage(t.closed);
    }
    setStatus("checking");
    // 1. the PDFs go into the private bucket, in a folder with a random name
    const uploadId = crypto.randomUUID();
    const paths: { permit?: string; licence?: string } = {};
    for (const [key, name, file] of [["permit", "permit", files.permit], ["licence", "licence", files.licence]] as const) {
      if (!file) continue;
      const path = pdfPath(uploadId, name);
      const { error } = await supabase.storage.from("applications").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) {
        setStatus("wrong");
        return setMessage(t.uploadFailed);
      }
      paths[key] = path;
    }
    // 2. the application: the database checks every rule again and saves it as "New" (pending)
    const { error } = await supabase.rpc("submit_insider_application", { p: buildPayload(v, paths, smsOn) });
    if (error) {
      setStatus("wrong");
      const m = /APPLY: (.*)$/.exec(error.message);
      return setMessage(m ? m[1] : t.failed);
    }
    setStatus("correct");
    await new Promise((r) => window.setTimeout(r, reduced() ? 300 : 1100));
    fly();
  }

  // the seven cards fly into a bookmark; it drops down and opens into the confirmation
  function fly() {
    if (reduced() || !cards.current || !bookmark.current) return setPhase("done");
    setPhase("flying");
    const box = cards.current.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + Math.min(box.height / 2, 240);
    const marks = [...cards.current.children] as HTMLElement[];
    marks.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      c.animate(
        [{ transform: "none", opacity: 1 }, { transform: `translate(${cx - (r.left + r.width / 2)}px, ${cy - (r.top + r.height / 2)}px) scale(0.08)`, opacity: 0 }],
        { duration: 650, delay: i * 70, easing: "cubic-bezier(0.5, 0, 0.8, 0.4)", fill: "forwards" },
      );
    });
    const b = bookmark.current;
    b.style.left = `${cx}px`;
    b.style.top = `${cy}px`;
    const arrive = 650 + marks.length * 70;
    const drop = b.animate(
      [{ opacity: 0, transform: "translate(-50%, -50%) scale(0.2)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: 0.3 }, { opacity: 1, transform: "translate(-50%, 40px) scale(1)" }],
      { duration: 700, delay: arrive - 250, easing: "ease-in", fill: "forwards" },
    );
    drop.finished.then(() => {
      const open = b.animate([{ opacity: 1, transform: "translate(-50%, 40px) scaleX(1)" }, { opacity: 0, transform: "translate(-50%, 40px) scaleX(6) scaleY(0.4)" }], { duration: 450, easing: "ease-out", fill: "forwards" });
      setPhase("done");
      requestAnimationFrame(() => confirm.current?.animate([{ opacity: 0, transform: "scale(0.7)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" }));
      void open;
    }, () => setPhase("done"));
  }

  const upd = (patch: Partial<Values>) => { setV((o) => ({ ...o, ...patch })); setMessage(""); };
  const agency = v.type === "agency";

  if (phase === "done")
    return (
      <div ref={confirm} role="status" className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-rosesoft bg-card p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-maroon text-cream">
          <svg viewBox="0 0 20 20" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
        </span>
        <h2 className="font-brand text-3xl font-bold text-maroonink">{t.doneTitle}</h2>
        <p className="text-lg">{t.doneLead}</p>
        <Link href="/" className={`${ghost} mx-auto`}>Back to the home page</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl">
      {/* the progress bar */}
      <div className="mb-6" role="progressbar" aria-valuemin={1} aria-valuemax={8} aria-valuenow={step + 1} aria-label={t.progress(Math.min(step + 1, 7), 7)}>
        <ol className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s} className={`h-2 flex-1 rounded-full transition-colors ${i < step || step === 7 ? "bg-maroon" : i === step ? "bg-coral" : "bg-rosesoft"}`} />
          ))}
        </ol>
        <p className="mt-2 text-sm font-semibold text-mutedtext">{step === 7 ? t.review : t.progress(step + 1, 7)}</p>
      </div>

      {id && (
        <form onSubmit={next} noValidate className="grid gap-6 rounded-3xl border border-rosesoft bg-card p-6 sm:p-8">
          <header>
            <h2 className="font-brand text-3xl font-bold text-maroonink">{t.steps[step].title}</h2>
            <p className="mt-2 text-lg text-mutedtext">{t.steps[step].lead}</p>
          </header>

          {id === "joining" && (
            <div className="grid gap-3">
              <Choice name="join" value="regular" current={v.joinType} onPick={() => upd({ joinType: "regular" })} title="Regular Insider" />
              <Choice name="join" value="founding" current={v.joinType} onPick={() => upd({ joinType: "founding" })} title="Founding Insider" note="By invitation only" />
              {v.joinType === "founding" && (
                <Field id="invite" label="Your invite code">
                  <input id="invite" className={`${input} uppercase tracking-widest`} value={v.inviteCode} onChange={(e) => set("inviteCode", e.target.value)} autoCapitalize="characters" autoComplete="off" />
                </Field>
              )}
            </div>
          )}

          {id === "type" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice name="type" value="solo" current={v.type} onPick={() => upd({ type: "solo", accounts: v.accounts.slice(0, 1) })} title="Solo creator" note="Just you" />
              <Choice name="type" value="agency" current={v.type} onPick={() => upd({ type: "agency" })} title="Marketing agency or company" note="You work for a team" />
            </div>
          )}

          {id === "details" && !agency && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first" label="First name"><input id="first" className={input} value={v.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" /></Field>
              <Field id="middle" label="Middle name" optional><input id="middle" className={input} value={v.middleName} onChange={(e) => set("middleName", e.target.value)} autoComplete="additional-name" /></Field>
              <Field id="last" label="Last name"><input id="last" className={input} value={v.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" /></Field>
              <Field id="gender" label="Gender">
                <select id="gender" className={input} value={v.gender} onChange={(e) => set("gender", e.target.value as Values["gender"])}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="none">I prefer not to say</option>
                </select>
              </Field>
              <Field id="dob" label="Date of birth (18 or over)"><input id="dob" type="date" className={input} value={v.dob} onChange={(e) => set("dob", e.target.value)} autoComplete="bday" /></Field>
              <Field id="emirate" label="Emirate">
                <select id="emirate" className={input} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
                  <option value="">Choose...</option>
                  {EMIRATES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
            </div>
          )}
          {id === "details" && agency && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field id="company" label="Company name"><input id="company" className={input} value={v.companyName} onChange={(e) => set("companyName", e.target.value)} autoComplete="organization" /></Field></div>
              <Field id="country" label="Country"><input id="country" className={`${input} opacity-80`} value={COUNTRY} readOnly aria-readonly="true" /></Field>
              <Field id="emirate" label="Emirate">
                <select id="emirate" className={input} value={v.emirate} onChange={(e) => set("emirate", e.target.value)}>
                  <option value="">Choose...</option>
                  {EMIRATES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </Field>
              <p className="font-bold sm:col-span-2">Contact person</p>
              <Field id="cfirst" label="First name"><input id="cfirst" className={input} value={v.contactFirst} onChange={(e) => set("contactFirst", e.target.value)} /></Field>
              <Field id="clast" label="Last name"><input id="clast" className={input} value={v.contactLast} onChange={(e) => set("contactLast", e.target.value)} /></Field>
              <Field id="cdob" label="Date of birth (18 or over)"><input id="cdob" type="date" className={input} value={v.contactDob} onChange={(e) => set("contactDob", e.target.value)} /></Field>
            </div>
          )}

          {id === "emails" && (
            <div className="grid gap-4">
              <CodeRow id="e-biz" label="Business email" required value={v.email} onChange={(x) => set("email", x)} verified={emailVerified(v, "email")} onVerified={(x) => upd({ verified: { ...v.verified, email: x } })} />
              <CodeRow id="e-per" label="Personal email" value={v.personalEmail} onChange={(x) => set("personalEmail", x)} verified={emailVerified(v, "personalEmail")} onVerified={(x) => upd({ verified: { ...v.verified, personalEmail: x } })} />
              <CodeRow id="e-bak" label="Backup email" value={v.backupEmail} onChange={(x) => set("backupEmail", x)} verified={emailVerified(v, "backupEmail")} onVerified={(x) => upd({ verified: { ...v.verified, backupEmail: x } })} />
            </div>
          )}

          {id === "phones" && (
            <div className="grid gap-4">
              {!smsOn && <p role="note" className="rounded-xl bg-pinktint p-3 text-sm font-semibold">{t.smsOff}</p>}
              <Field id="phone" label="Phone number"><input id="phone" type="tel" inputMode="tel" className={input} value={v.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+971 50 000 0000" /></Field>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
                <input type="checkbox" className="size-6" checked={v.sameAsPhone} onChange={(e) => upd({ sameAsPhone: e.target.checked })} />
                {t.sameAsPhone}
              </label>
              {!v.sameAsPhone && <Field id="wa" label="WhatsApp number"><input id="wa" type="tel" inputMode="tel" className={input} value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+971 50 000 0000" /></Field>}
              <Field id="bphone" label="Backup phone" optional><input id="bphone" type="tel" inputMode="tel" className={input} value={v.backupPhone} onChange={(e) => set("backupPhone", e.target.value)} /></Field>
              <Field id="land" label="Landline" optional><input id="land" type="tel" inputMode="tel" className={input} value={v.landline} onChange={(e) => set("landline", e.target.value)} /></Field>
              {smsOn && phoneVerified(v, "phone") && <p role="status" className="font-bold text-maroonink">Phone verified</p>}
            </div>
          )}

          {id === "social" && (
            <div className="grid gap-5">
              {v.accounts.map((a, i) => (
                <div key={i} className="grid gap-3 rounded-2xl border border-rosesoft p-4 sm:grid-cols-2">
                  <Field id={`ig-link-${i}`} label={`Instagram profile link${agency ? ` ${i + 1}` : ""}`}><input id={`ig-link-${i}`} className={input} value={a.link} placeholder="https://www.instagram.com/..." onChange={(e) => upd({ accounts: v.accounts.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)) })} autoCapitalize="none" /></Field>
                  <Field id={`ig-handle-${i}`} label="Instagram handle"><input id={`ig-handle-${i}`} className={input} value={a.handle} placeholder="@yourname" onChange={(e) => upd({ accounts: v.accounts.map((x, j) => (j === i ? { ...x, handle: e.target.value } : x)) })} autoCapitalize="none" /></Field>
                  {agency && v.accounts.length > 1 && <button type="button" className={`${ghost} sm:col-span-2`} onClick={() => upd({ accounts: v.accounts.filter((_, j) => j !== i) })}>Remove this account</button>}
                </div>
              ))}
              {agency && v.accounts.length < MAX_AGENCY_ACCOUNTS && <button type="button" className={`${ghost} w-fit`} onClick={() => upd({ accounts: [...v.accounts, { link: "", handle: "" }] })}>Add another Instagram account</button>}
              <Field id="tiktok" label="TikTok handle" optional><input id="tiktok" className={input} value={v.tiktok} placeholder="@yourname" onChange={(e) => set("tiktok", e.target.value)} autoCapitalize="none" /></Field>
              <Field id="youtube" label="YouTube link" optional><input id="youtube" className={input} value={v.youtube} placeholder="https://www.youtube.com/..." onChange={(e) => set("youtube", e.target.value)} autoCapitalize="none" /></Field>
              <Field id="snap" label="Snapchat handle" optional><input id="snap" className={input} value={v.snapchat} onChange={(e) => set("snapchat", e.target.value)} autoCapitalize="none" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="oname" label="Another platform: name" optional><input id="oname" className={input} value={v.otherName} onChange={(e) => set("otherName", e.target.value)} /></Field>
                <Field id="olink" label="Another platform: link" optional><input id="olink" className={input} value={v.otherLink} onChange={(e) => set("otherLink", e.target.value)} autoCapitalize="none" /></Field>
              </div>
            </div>
          )}

          {id === "documents" && (
            <div className="grid gap-5">
              {(["permit", "licence"] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`f-${k}`} className={label}>
                    {k === "permit" ? "UAE Advertiser Permit (PDF)" : "UAE trade licence (PDF)"} <span className="font-normal text-mutedtext">({k === "permit" || agency ? "required" : "optional"})</span>
                  </label>
                  <input id={`f-${k}`} type="file" accept="application/pdf,.pdf" className={`${input} py-2.5`} onChange={(e) => void pick(k, e.target.files?.[0] ?? null)} />
                  <p className="mt-1 text-sm text-mutedtext">{files[k] ? files[k]!.name : `PDF only, up to ${MAX_PDF_BYTES / 1024 / 1024} MB`}</p>
                </div>
              ))}
            </div>
          )}

          {message && <p role="alert" className="font-bold text-problem">{message}</p>}
          <div className="flex flex-wrap gap-3">
            {step > 0 && <button type="button" className={ghost} onClick={() => { setStep(step - 1); setMessage(""); }}>{t.back}</button>}
            <button type="submit" className={primary}>{step === 6 ? t.review : t.next}</button>
          </div>
        </form>
      )}

      {step === 7 && (
        <form onSubmit={submit} noValidate className="grid gap-6">
          <header>
            <h2 className="font-brand text-3xl font-bold text-maroonink">{t.reviewTitle}</h2>
            <p className="mt-2 text-lg text-mutedtext">{t.reviewLead}</p>
          </header>
          <div ref={cards} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary(v, { permit: files.permit?.name ?? "", licence: files.licence?.name ?? "" }).map((c, i) => (
              <section key={c.step} aria-labelledby={`card-${c.step}`} className="flex flex-col rounded-2xl border border-rosesoft bg-card p-4">
                <p className="text-xs font-bold text-mutedtext">{i + 1}</p>
                <h3 id={`card-${c.step}`} className="font-brand text-lg font-bold text-maroonink">{c.title}</h3>
                <ul className="mt-2 flex-1 text-sm leading-relaxed">{c.lines.map((l) => <li key={l} className="break-words">{l}</li>)}</ul>
                <button type="button" className="mt-3 min-h-11 w-fit text-sm font-bold text-maroonink underline" onClick={() => { setStep(STEPS.indexOf(c.step)); setStatus("waiting"); }}>{t.edit}</button>
              </section>
            ))}
          </div>
          <fieldset className="grid gap-2 rounded-2xl bg-pinktint p-4">
            {([["terms", t.ticks.terms, "/terms"], ["privacy", t.ticks.privacy, "/privacy"], ["confidentiality", t.ticks.confidentiality, "/confidentiality"]] as const).map(([k, l, href]) => (
              <label key={k} className="flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-6" checked={v.accepted[k]} onChange={(e) => { setV((o) => ({ ...o, accepted: { ...o.accepted, [k]: e.target.checked } })); setMessage(""); setStatus("waiting"); }} />
                <span>{l} (<Link href={href} target="_blank" className="font-bold text-maroonink underline">read</Link>)</span>
              </label>
            ))}
          </fieldset>
          {message && <p role="alert" className="font-bold text-problem">{message}</p>}
          <div className="mx-auto w-full max-w-sm">
            <VerifyButton state={status} words={SUBMIT_WORDS} />
          </div>
          <button type="button" className={`${ghost} mx-auto`} onClick={() => setStep(6)}>{t.back}</button>
        </form>
      )}

      {/* the red bookmark the cards fly into */}
      <div ref={bookmark} aria-hidden="true" className="pointer-events-none fixed z-50 opacity-0" style={{ transform: "translate(-50%, -50%)" }}>
        <svg width="64" height="80" viewBox="0 0 24 28"><path d="M3 1h18v26l-9-7-9 7z" fill="var(--coral)" /></svg>
      </div>
    </div>
  );
}
