"use client";

// "We got your form": shown after an Insider OR a Partner sends the form.
//   * the BIG reference code (letters, then numbers; text only, NO QR code) with a Copy button,
//   * the note: it is a reference number for now, and becomes the active code once the team approves.
// Only the floating Rate us star shows on this screen: the round WhatsApp button is hidden while it is here, and the Rate us card
// never opens by itself (it opens only when someone taps the star or the footer link).
import { useEffect, useState } from "react";
import Link from "next/link";
import { text } from "@/content";
import { CODE_NOTE, splitCode, type ApplyKind } from "@/lib/referenceCode";

const t = text.insiderForm;

export default function ApplyConfirmation({ kind, code }: { kind: ApplyKind; code: string | null }) {
  const [copied, setCopied] = useState(false);

  // hide the corner WhatsApp button while this screen is up (the page CSS looks at this mark)
  useEffect(() => {
    document.documentElement.dataset.hideWhatsapp = "true";
    return () => {
      delete document.documentElement.dataset.hideWhatsapp;
    };
  }, []);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // an older browser: select the text through a temporary box
      const box = document.createElement("textarea");
      box.value = code;
      document.body.appendChild(box);
      box.select();
      try {
        document.execCommand("copy");
      } catch {
        // nothing more we can do: the code is on the screen to copy by hand
      }
      box.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const parts = code ? splitCode(kind, code) : null;
  return (
    <div role="status" className="mx-auto grid max-w-xl gap-5 rounded-3xl border border-rosesoft bg-card p-8 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-maroon text-cream">
        <svg viewBox="0 0 20 20" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>
      </span>
      <h2 className="font-brand text-3xl font-bold text-maroonink">{t.doneTitle}</h2>
      <p className="text-lg">{t.doneLead}</p>
      {parts && code && (
        <div className="grid gap-3">
          <p className="text-sm font-bold text-mutedtext">{t.codeLabel}</p>
          <p aria-label={`${t.codeLabel}: ${code.split("").join(" ")}`} className="flex select-all flex-wrap justify-center gap-x-5 gap-y-1 font-brand text-[clamp(1.9rem,7vw,3rem)] font-bold leading-none tracking-[0.1em] text-maroonink">
            <span className="whitespace-nowrap">{parts.letters}</span>
            <span className="whitespace-nowrap">{parts.numbers}</span>
          </p>
          <button type="button" onClick={copy} className="mx-auto inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-oncoral transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral">
            {copied ? t.copied : t.copy}
          </button>
          <span role="status" className="sr-only">{copied ? t.copied : ""}</span>
          <p className="text-base font-semibold">{CODE_NOTE}</p>
        </div>
      )}
      <Link href="/" className="mx-auto inline-flex min-h-12 items-center justify-center rounded-full border border-maroonink px-7 font-bar text-base font-bold text-maroonink transition hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-coral">{t.home}</Link>
    </div>
  );
}
