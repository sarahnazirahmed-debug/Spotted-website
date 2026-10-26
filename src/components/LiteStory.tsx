"use client";

// The simple version: no 3D, just the same story as plain sections.
// Used when the phone is slow, 3D is not supported, or the visitor asks for less motion.

import Waitlist from "./Waitlist";

function Bookmark({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18l-6-5-6 5z" fill={color} />
    </svg>
  );
}

function Star({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.7 5.6 21.5l1.7-7.2L2 9.6 9 9z" fill={color} />
    </svg>
  );
}

const SECTIONS = [
  {
    tag: "Journey 1 · You",
    title: "Save a place from a reel. Get a nudge when you walk past.",
    text: "Spot a café you love, tap to save it, and Spotted tells you when a saved place is 1 km away.",
    art: (
      <div className="flex items-center gap-3">
        <Bookmark color="#E5383B" />
        <span className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-deep">
          A place you saved is 1 km away
        </span>
      </div>
    ),
  },
  {
    tag: "Journey 2 · Restaurants",
    title: "Saves turn into visits.",
    text: "Restaurants see people saving them, and can send offers to the people who saved.",
    art: (
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((k) => (
          <Bookmark key={k} color="#6A1FB0" size={40} />
        ))}
      </div>
    ),
  },
  {
    tag: "Journey 3 · Influencers",
    title: "Every save you inspire lands at the café.",
    text: "Influencers share a reel, people save the place, and the café earns trust.",
    art: (
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((k) => (
          <Star key={k} color={k < 3 ? "#C9A2FF" : "#FFD23F"} />
        ))}
      </div>
    ),
  },
];

export default function LiteStory({ onSwitch }: { onSwitch: () => void }) {
  return (
    <main>
      <section className="bg-brand px-5 pb-14 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold">Spotted</span>
            <button
              type="button"
              onClick={onSwitch}
              className="min-h-11 rounded-full bg-white/15 px-4 text-sm font-bold"
            >
              Try 3D version
            </button>
          </div>
          <div className="mt-12 flex items-start gap-3">
            <Bookmark color="#E5383B" size={72} />
          </div>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight">Spot it. Save it.</h1>
          <p className="mt-3 text-lg text-lilac">Get a nudge when you are near.</p>
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.tag} className="px-5 py-12 even:bg-lilac/40">
          <div className="mx-auto max-w-2xl">
            <span className="rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">{s.tag}</span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-deep">{s.title}</h2>
            <p className="mt-3">{s.text}</p>
            <div className="mt-6 inline-block rounded-3xl bg-deep p-5">{s.art}</div>
          </div>
        </section>
      ))}

      <section className="bg-deep px-5 py-14 text-white">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight">Launching 1 January in the UAE</h2>
          <p className="mb-5 mt-2 text-lilac">Be first to know when Spotted opens.</p>
          <Waitlist />
        </div>
      </section>
    </main>
  );
}
