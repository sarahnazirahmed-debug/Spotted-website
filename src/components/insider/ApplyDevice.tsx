"use client";

// "What you need to apply": the checklist card on the left, and on the right a drawn phone or tablet
// (a Phone / Tablet switch of two buttons) showing the same list as a "Your application" screen,
// with small dashed "Upload PDF" tags on the items that need a PDF.
import { useState } from "react";

export type ApplyCopy = {
  items: { label: string; tags: string[] }[];
  applyChecklistTitle: string;
  applyNote: string;
  screenTitle: string;
  uploadPdf: string;
  device: { phone: string; tablet: string; switchLabel: string };
};

// The look of the three tags.
function Tag({ word, small = false }: { word: string; small?: boolean }) {
  const size = small ? "px-2 py-0.5 text-[0.65rem]" : "px-2.5 py-0.5 text-xs";
  const look =
    word === "Required" ? "bg-maroon text-cream" : word === "PDF" ? "border border-dashed border-rose-line text-maroonink" : "border border-rosesoft bg-pinktint text-mutedtext";
  return <span className={`inline-block rounded-full font-bold ${size} ${look}`}>{word}</span>;
}

function Checklist({ t }: { t: ApplyCopy }) {
  return (
    <div className="rounded-2xl border border-rosesoft bg-card p-6 text-darktext">
      <h3 className="font-brand text-xl font-bold">{t.applyChecklistTitle}</h3>
      <ul className="mt-4 grid gap-1">
        {t.items.map((it) => (
          <li key={it.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-rosesoft py-3 last:border-0">
            <span className="flex items-center gap-3 text-base">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-maroonink">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {it.label}
            </span>
            <span className="flex gap-1.5">
              {it.tags.map((g) => (
                <Tag key={g} word={g} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      {t.applyNote && <p className="mt-4 text-sm font-semibold text-mutedtext">{t.applyNote}</p>}
    </div>
  );
}

export default function ApplyDevice({ t }: { t: ApplyCopy }) {
  const [device, setDevice] = useState<"phone" | "tablet">("phone");
  const btn = (id: "phone" | "tablet", label: string) => (
    <button
      type="button"
      aria-pressed={device === id}
      onClick={() => setDevice(id)}
      className={`min-h-11 rounded-full px-5 font-bar text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${
        device === id ? "bg-maroon text-cream" : "border border-rosesoft bg-card text-darktext"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <div>
        <Checklist t={t} />
      </div>
      <div className="flex flex-col items-center">
        <div role="group" aria-label={t.device.switchLabel} className="mb-5 flex gap-2">
          {btn("phone", t.device.phone)}
          {btn("tablet", t.device.tablet)}
        </div>
        {/* the drawn device: a plain frame with the same list inside */}
        <div
          aria-hidden="true"
          className={`w-full rounded-[2rem] border-[6px] border-maroonink bg-card p-4 text-darktext shadow-xl ${device === "phone" ? "max-w-[16rem]" : "max-w-md"}`}
        >
          <p className="font-brand text-base font-bold">{t.screenTitle}</p>
          <ul className="mt-3 grid gap-2">
            {t.items.map((it) => (
              <li key={it.label} className="rounded-xl bg-pinktint px-3 py-2">
                <span className="block text-xs font-semibold leading-snug">{it.label}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {it.tags.includes("PDF") ? <span className="inline-block rounded-full border border-dashed border-rose-line px-2 py-0.5 text-[0.65rem] font-bold text-maroonink">{t.uploadPdf}</span> : null}
                  {it.tags.filter((g) => g !== "PDF").map((g) => (
                    <Tag key={g} word={g} small />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
