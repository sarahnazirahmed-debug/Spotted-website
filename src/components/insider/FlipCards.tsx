"use client";

// "Why become an Insider / Partner": four cards. Tap (or press Enter) on a card and it turns maroon and shows the text.
// Tap again to turn it back. No movement is used, so it is fine with Reduce Motion.
import { useState } from "react";
import { Icon, type IconName } from "../site/Icons";
import { Star } from "../creators/Stars";

const ICONS: IconName[] = ["star", "bookmark", "pin", "chart"];

type Card = { title: string; text: string; stars: boolean };

export default function FlipCards({ cards, hint }: { cards: Card[]; hint: string }) {
  const [open, setOpen] = useState<boolean[]>(cards.map(() => false));
  const toggle = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => {
        const back = open[i];
        return (
          <li key={c.title}>
            <button
              type="button"
              aria-pressed={back}
              onClick={() => toggle(i)}
              className={`flex min-h-48 w-full flex-col rounded-2xl border p-6 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${
                back ? "border-maroonink bg-maroon text-cream" : "border-rosesoft bg-card text-darktext hover:border-rose-line"
              }`}
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${back ? "bg-coral text-oncoral" : "bg-pinktint text-maroonink"}`}>
                <Icon name={ICONS[i]} size={22} />
              </span>
              <span className="mt-4 font-brand text-xl font-bold leading-snug">{c.title}</span>
              {back ? (
                <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-relaxed">
                  {c.text}
                  {c.stars && (
                    <span className="flex items-center gap-1" aria-hidden="true">
                      <Star kind="visit" size={22} />
                      <Star kind="sale" size={22} />
                    </span>
                  )}
                </span>
              ) : (
                <span className="mt-auto pt-4 text-sm font-semibold text-mutedtext">{hint}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
