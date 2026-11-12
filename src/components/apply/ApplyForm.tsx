"use client";

// The ONE Apply form for both Insiders and Partners (/apply?type=insider or /apply?type=partner).
// What it does when the person presses "Send my application":
//   1. checks the three tick boxes (all must be ticked), then the questions (src/lib/applyRules.ts),
//   2. uploads the PDFs into the PRIVATE storage bucket "applications" (PDF only, 5 MB at most),
//   3. calls the database function submit_application, which checks everything again and saves the
//      application with the status "New" (supabase/applications.sql),
//   4. opens the thank-you page.
// The age is worked out from the date of birth and shown; it is never asked.
import { useState } from "react";
import { isMissingFunction } from "@/lib/referenceCode";
import ApplyConfirmation from "./ApplyConfirmation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PARTNER_PRICE_CARDS, cardPriceKey, priceLabel } from "@/config/pricing";
import { useSiteSettings } from "@/lib/siteSettings";
import { text } from "@/content";
import { getSupabase } from "@/lib/supabase";
import {
  ageFromDob, BUSINESS_TYPES, cleanHandleOrEmpty, EMIRATES, insiderProblem, isFoodType, partnerProblem, pdfPath, pdfProblem,
  type InsiderValues, type PartnerValues,
} from "@/lib/applyRules";

const t = text.apply;
const input =
  "min-h-12 w-full rounded-xl border border-rosesoft bg-card px-4 text-base text-darktext outline-none focus:border-maroonink focus:ring-4 focus:ring-coral/40";
const labelCls = "mb-1 block text-sm font-semibold text-darktext";
const hint = "mt-1 text-xs font-medium text-mutedtext";

function Field({ id, label, optional, note, children }: { id: string; label: string; optional?: boolean; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {optional && <span className="font-medium text-mutedtext">({t.optional})</span>}
      </label>
      {children}
      {note && <p className={hint}>{note}</p>}
    </div>
  );
}

// A PDF chooser: checks the file as soon as it is chosen (PDF, 5 MB at most).
function PdfField({ id, label, file, onFile }: { id: string; label: string; file: File | null; onFile: (f: File | null) => void }) {
  const [problem, setProblem] = useState("");
  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return onFile(null);
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    const bad = pdfProblem(f, head);
    setProblem(bad ?? "");
    onFile(bad ? null : f);
    if (bad) e.target.value = "";
  }
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-rose-line bg-pinktint px-4 text-sm font-semibold text-maroonink focus-within:ring-4 focus-within:ring-coral/40"
      >
        <span>{file ? `${t.fileChosen} ${file.name}` : t.chooseFile}</span>
        <input id={id} type="file" accept="application/pdf,.pdf" onChange={choose} className="sr-only" />
      </label>
      <p className={hint}>{t.uploadHint}</p>
      {problem && (
        <p role="alert" className="mt-1 text-sm font-semibold text-problem">
          {problem}
        </p>
      )}
    </div>
  );
}

export default function ApplyForm() {
  const sitePrices = useSiteSettings().prices; // plan prices typed on the Pin Desk
  const router = useRouter();
  const params = useSearchParams();
  const kind = params.get("type") === "partner" ? "partner" : "insider";
  const [ticks, setTicks] = useState({ terms: false, privacy: false, confidentiality: false });
  const [tickError, setTickError] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // a Partner application was sent: show "We got your form" with the code
  const [doneCode, setDoneCode] = useState<string | null>(null);
  const [trap, setTrap] = useState(""); // a hidden box that only robots fill in

  const [ins, setIns] = useState({
    joinType: (params.get("how") === "founding" ? "founding" : "regular") as "regular" | "founding",
    inviteCode: "", fullName: "", dob: "", email: "", phone: "", profileLink: "", instagram: "", tiktok: "", youtube: "", snapchat: "", otherName: "", otherLink: "",
  });
  const [par, setPar] = useState({ businessName: "", businessType: "", ownerName: "", email: "", phone: "", instagram: "", website: "", emirate: "", plan: "" });
  const [files, setFiles] = useState<{ permit: File | null; licence: File | null; food: File | null }>({ permit: null, licence: null, food: null });

  const setI = (k: keyof typeof ins) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setIns((o) => ({ ...o, [k]: e.target.value }));
    setMessage("");
  };
  const setP = (k: keyof typeof par) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPar((o) => ({ ...o, [k]: e.target.value }));
    setMessage("");
  };
  const allTicked = ticks.terms && ticks.privacy && ticks.confidentiality;
  const age = kind === "insider" && ins.dob ? ageFromDob(ins.dob) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allTicked) {
      setTickError(true);
      return;
    }
    setTickError(false);
    if (trap) return router.push("/apply/thanks"); // a robot: pretend it worked

    const problem =
      kind === "insider"
        ? insiderProblem({ ...ins, hasPermit: !!files.permit } satisfies InsiderValues)
        : partnerProblem({ ...par, hasLicence: !!files.licence, hasFoodPermit: !!files.food } satisfies PartnerValues);
    if (problem) return setMessage(problem);

    const supabase = getSupabase();
    if (!supabase) return setMessage(t.closed);
    setBusy(true);
    setMessage("");

    // 1. the PDFs go into the private bucket, in a folder with a random name
    const uploadId = crypto.randomUUID();
    const paths: Record<string, string> = {};
    const toUpload: [string, "permit" | "licence" | "food-permit", File | null][] = [
      ["advertiser_permit_path", "permit", kind === "insider" ? files.permit : null],
      ["trade_licence_path", "licence", files.licence],
      ["food_permit_path", "food-permit", kind === "partner" && isFoodType(par.businessType) ? files.food : null],
    ];
    for (const [key, name, file] of toUpload) {
      if (!file) continue;
      const path = pdfPath(uploadId, name);
      const { error } = await supabase.storage.from("applications").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) {
        setBusy(false);
        return setMessage(t.uploadFailed);
      }
      paths[key] = path;
    }

    // 2. the application itself: the database checks every rule again
    const common = { kind, accepted_terms: true, accepted_privacy: true, accepted_confidentiality: true, ...paths };
    const payload =
      kind === "insider"
        ? {
            ...common, join_type: ins.joinType, invite_code: ins.inviteCode.trim(), contact_name: ins.fullName.trim(), date_of_birth: ins.dob,
            email: ins.email.trim(), phone: ins.phone.trim(), profile_link: ins.profileLink.trim(), instagram: cleanHandleOrEmpty(ins.instagram),
            tiktok: cleanHandleOrEmpty(ins.tiktok), youtube_link: ins.youtube.trim(), snapchat: ins.snapchat.trim().replace(/^@+/, ""),
            other_platform_name: ins.otherName.trim(), other_platform_link: ins.otherLink.trim(),
          }
        : {
            ...common, contact_name: par.ownerName.trim(), email: par.email.trim(), phone: par.phone.trim(), business_name: par.businessName.trim(),
            business_type: par.businessType, instagram: cleanHandleOrEmpty(par.instagram), website: par.website.trim(), emirate: par.emirate,
            plan_interest: par.plan,
          };
    // Partners: the database saves it and gives back the reference code. (Branches are not asked: partners add them later in their dashboard.)
    let { data, error } = await supabase.rpc(kind === "partner" ? "submit_application_with_code" : "submit_application", { p: payload });
    if (kind === "partner" && isMissingFunction(error)) ({ data, error } = await supabase.rpc("submit_application", { p: { ...payload, branches: 1 } })); // the code file is not run yet
    setBusy(false);
    if (error) {
      // the database's own messages start with "APPLY: " and are written for visitors
      const m = /APPLY: (.*)$/.exec(error.message);
      return setMessage(m ? m[1] : t.failed);
    }
    if (kind === "partner") {
      setDoneCode(typeof data === "string" && /^[A-Z2-9]{8}$/.test(data) ? data : null);
      setDone(true);
      return;
    }
    router.push("/apply/thanks");
  }

  if (done) return <ApplyConfirmation kind="partner" code={doneCode} />;

  const other = kind === "insider" ? { href: "/apply?type=partner", label: t.switchToPartner } : { href: "/apply?type=insider", label: t.switchToInsider };
  const tick = (key: keyof typeof ticks, label: string, href: string) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
      <input
        type="checkbox"
        checked={ticks[key]}
        onChange={(e) => {
          setTicks((o) => ({ ...o, [key]: e.target.checked }));
          setTickError(false);
        }}
        className="mt-1 size-6 shrink-0 accent-maroon"
      />
      <span>
        {label}{" "}
        <Link href={href} target="_blank" className="font-semibold text-maroonink underline">
          ({href.slice(1)})
        </Link>
      </span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto grid max-w-2xl gap-5 [color-scheme:light] rounded-2xl border border-rosesoft bg-pagebase p-6 text-darktext md:p-8">
      {kind === "insider" ? (
        <>
          <fieldset>
            <legend className={labelCls}>{t.joinLabel}</legend>
            <div className="grid gap-1">
              {(["regular", "founding"] as const).map((j) => (
                <label key={j} className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
                  <input type="radio" name="join" checked={ins.joinType === j} onChange={() => setIns((o) => ({ ...o, joinType: j }))} className="size-5 accent-maroon" />
                  {j === "regular" ? t.joinRegular : t.joinFounding}
                </label>
              ))}
            </div>
          </fieldset>
          {ins.joinType === "founding" && (
            <Field id="invite" label={t.inviteCode} note={t.inviteHint}>
              <input id="invite" className={`${input} uppercase tracking-widest`} value={ins.inviteCode} onChange={setI("inviteCode")} autoComplete="off" />
            </Field>
          )}
          <Field id="fullName" label={t.fullName}>
            <input id="fullName" className={input} value={ins.fullName} onChange={setI("fullName")} autoComplete="name" />
          </Field>
          <Field id="dob" label={t.dob} note={age !== null && age >= 0 ? t.ageIs(age) : t.dobHint}>
            <input id="dob" type="date" className={input} value={ins.dob} onChange={setI("dob")} autoComplete="bday" />
          </Field>
          <Field id="email" label={t.businessEmail}>
            <input id="email" type="email" inputMode="email" className={input} value={ins.email} onChange={setI("email")} autoComplete="email" />
          </Field>
          <Field id="phone" label={t.phone}>
            <input id="phone" type="tel" inputMode="tel" className={input} value={ins.phone} onChange={setI("phone")} autoComplete="tel" placeholder="+971 50 000 0000" />
          </Field>
          <Field id="profile" label={t.profileLink}>
            <input id="profile" type="url" inputMode="url" className={input} value={ins.profileLink} onChange={setI("profileLink")} placeholder="https://" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="instagram" label={t.instagram}>
              <input id="instagram" className={input} value={ins.instagram} onChange={setI("instagram")} placeholder="@" />
            </Field>
            <Field id="tiktok" label={t.tiktok}>
              <input id="tiktok" className={input} value={ins.tiktok} onChange={setI("tiktok")} placeholder="@" />
            </Field>
          </div>
          <Field id="youtube" label={t.youtube} optional>
            <input id="youtube" type="url" inputMode="url" className={input} value={ins.youtube} onChange={setI("youtube")} placeholder="https://" />
          </Field>
          <Field id="snapchat" label={t.snapchat} optional>
            <input id="snapchat" className={input} value={ins.snapchat} onChange={setI("snapchat")} placeholder="@" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="otherName" label={t.otherName} optional>
              <input id="otherName" className={input} value={ins.otherName} onChange={setI("otherName")} />
            </Field>
            <Field id="otherLink" label={t.otherLink} optional>
              <input id="otherLink" type="url" inputMode="url" className={input} value={ins.otherLink} onChange={setI("otherLink")} placeholder="https://" />
            </Field>
          </div>
          <PdfField id="permit" label={t.permit} file={files.permit} onFile={(f) => setFiles((o) => ({ ...o, permit: f }))} />
          <PdfField id="licence" label={t.tradeLicenceOptional} file={files.licence} onFile={(f) => setFiles((o) => ({ ...o, licence: f }))} />
        </>
      ) : (
        <>
          <Field id="businessName" label={t.businessName}>
            <input id="businessName" className={input} value={par.businessName} onChange={setP("businessName")} autoComplete="organization" />
          </Field>
          <Field id="businessType" label={t.businessType}>
            <select id="businessType" className={input} value={par.businessType} onChange={setP("businessType")}>
              <option value="">{t.chooseOne}</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field id="ownerName" label={t.ownerName}>
            <input id="ownerName" className={input} value={par.ownerName} onChange={setP("ownerName")} autoComplete="name" />
          </Field>
          <Field id="pEmail" label={t.contactEmail}>
            <input id="pEmail" type="email" inputMode="email" className={input} value={par.email} onChange={setP("email")} autoComplete="email" />
          </Field>
          <Field id="pPhone" label={t.phone}>
            <input id="pPhone" type="tel" inputMode="tel" className={input} value={par.phone} onChange={setP("phone")} autoComplete="tel" placeholder="+971 50 000 0000" />
          </Field>
          <Field id="pInsta" label={t.businessInstagram}>
            <input id="pInsta" className={input} value={par.instagram} onChange={setP("instagram")} placeholder="@" />
          </Field>
          <Field id="pWeb" label={t.website} optional>
            <input id="pWeb" type="url" inputMode="url" className={input} value={par.website} onChange={setP("website")} placeholder="https://" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="emirate" label={t.emirate}>
              <select id="emirate" className={input} value={par.emirate} onChange={setP("emirate")}>
                <option value="">{t.chooseOne}</option>
                {EMIRATES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="plan" label={t.plan} optional>
            <select id="plan" className={input} value={par.plan} onChange={setP("plan")}>
              <option value="">{t.planNotSure}</option>
              {PARTNER_PRICE_CARDS.map((c) => {
                const label = priceLabel(sitePrices[cardPriceKey(c)] ?? null); // typed on the Pin Desk
                return (
                  <option key={c.id} value={`${c.name}${c.forWho ? ` (${c.forWho})` : ""} - ${label}`}>
                    {c.name}
                    {c.forWho ? ` (${c.forWho})` : ""} - {label}
                  </option>
                );
              })}
            </select>
          </Field>
          <PdfField id="pLicence" label={t.tradeLicenceRequired} file={files.licence} onFile={(f) => setFiles((o) => ({ ...o, licence: f }))} />
          {(isFoodType(par.businessType) || par.businessType === "") && (
            <PdfField id="pFood" label={t.foodPermit} file={files.food} onFile={(f) => setFiles((o) => ({ ...o, food: f }))} />
          )}
        </>
      )}

      {/* a trap for robots: people never see or fill this */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="company_site" />
      </div>

      {/* the three tick boxes: all must be ticked */}
      <fieldset className="grid gap-1 rounded-xl bg-pinktint p-4">
        <legend className="px-1 text-sm font-bold">{t.ticksTitle}</legend>
        {tick("terms", t.tickTerms, "/terms")}
        {tick("privacy", t.tickPrivacy, "/privacy")}
        {tick("confidentiality", t.tickConfidentiality, "/confidentiality")}
      </fieldset>
      {tickError && (
        <p role="alert" className="text-base font-bold text-problem">
          {t.tickError}
        </p>
      )}
      {message && (
        <p role="alert" className="text-base font-bold text-problem">
          {message}
        </p>
      )}

      {/* looks faded until all three are ticked, but can still be pressed so the red message can show */}
      <button
        type="submit"
        disabled={busy}
        aria-disabled={!allTicked}
        className={`inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-oncoral transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon ${
          allTicked ? "motion-safe:active:scale-95" : "opacity-50"
        }`}
      >
        {busy ? t.sending : t.send}
      </button>
      <Link href={other.href} className="text-center text-sm font-semibold text-maroonink underline">
        {other.label}
      </Link>
    </form>
  );
}
