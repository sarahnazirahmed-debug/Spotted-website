"use client";

// The FAQs: a list of questions on the left with thin lines between them. NOTHING is chosen at first.
//   * Hover: a question gets a soft button look.
//   * Click: the question is underlined and its answer slides in on the right.
//   * Click the same question again: it closes.
//   * Small screens: there is no right-hand side, so the answer opens UNDER the question.
// With Reduce Motion on, the answer simply appears (no sliding). Everything works with the keyboard.
import { useState } from "react";

export type FaqItem = { q: string; a: string };

export default function FaqList({ items, pick }: { items: FaqItem[]; pick: string }) {
  const [open, setOpen] = useState<number | null>(null); // nothing is selected at first
  const toggle = (i: number) => setOpen((o) => (o === i ? null : i));
  const chosen = open === null ? null : items[open];
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <ul className="border-t border-rosesoft" aria-label="Questions">
        {items.map((it, i) => {
          const on = open === i;
          return (
            <li key={it.q} className="border-b border-rosesoft">
              <button
                type="button"
                id={`faq-q-${i}`}
                aria-expanded={on}
                aria-controls={`faq-a-${i}`}
                onClick={() => toggle(i)}
                className={`my-1 flex min-h-14 w-full items-center rounded-xl px-3 py-2 text-left font-bar text-base font-semibold text-darktext transition hover:bg-pinktint motion-safe:active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${on ? "underline decoration-coral decoration-2 underline-offset-4" : ""}`}
              >
                {it.q}
              </button>
              {/* small screens: the answer opens under its question */}
              {on && (
                <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="faq-under px-3 pb-5 text-base leading-relaxed text-mutedtext md:hidden">
                  {it.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* wide screens: the answer slides in on the right */}
      <div className="hidden md:block" aria-live="polite">
        <div className="sticky top-24">
          {chosen && open !== null ? (
            <div key={open} role="region" aria-labelledby={`faq-q-${open}`} className="faq-side rounded-2xl border border-rosesoft bg-card p-7">
              <h2 className="font-brand text-2xl font-bold leading-tight text-maroonink">{chosen.q}</h2>
              <p className="mt-4 text-lg leading-relaxed">{chosen.a}</p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-rosesoft p-7 text-base font-semibold text-mutedtext">{pick}</p>
          )}
        </div>
      </div>
    </div>
  );
}
