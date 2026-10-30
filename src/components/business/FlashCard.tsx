"use client";

// A flash card for List and Grid. Front: dish picture, name, area. Hover (or tap on phones) flips it:
// "Saved by 1.2K" (only above 100), "2 offers" (count only), a "Spotted Partner" badge if paying,
// and a "View place" button.
import { useState } from "react";
import Link from "next/link";
import DishMedia from "./DishMedia";
import { offersLabel, savedLabel, type Place } from "./data";

export default function FlashCard({ place, layout }: { place: Place; layout: "list" | "grid" }) {
  const [flipped, setFlipped] = useState(false);
  const saved = savedLabel(place.saves);
  const offers = offersLabel(place.offers.length);
  const size = layout === "list" ? "h-40 sm:h-44" : "aspect-[4/5]";
  return (
    <div className={`flip ${flipped ? "flipped" : ""} ${size} w-full`}>
      <div className="flip-inner">
        {/* front */}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          aria-label={`${place.name}, ${place.area}. Tap to see details.`}
          className={`flip-face flex overflow-hidden rounded-3xl bg-box text-left text-white shadow-lg ${
            layout === "list" ? "flex-row" : "flex-col"
          }`}
        >
          <DishMedia place={place} className={layout === "list" ? "w-2/5 shrink-0" : "min-h-0 flex-1"} />
          <span className="flex flex-col justify-center gap-1 p-4">
            <span className="text-xl font-extrabold leading-tight">{place.name}</span>
            <span className="text-sm font-bold text-lilac">{place.area}</span>
          </span>
        </button>
        {/* back */}
        <div className="flip-face flip-back flex flex-col justify-between gap-3 rounded-3xl bg-brand p-5 text-white shadow-lg">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-extrabold leading-tight">{place.name}</h3>
            {place.partner && (
              <span className="w-fit rounded-full bg-lilac px-3 py-1 text-xs font-extrabold text-deep">Spotted Partner</span>
            )}
            {saved && <p className="text-base font-bold">Saved by {saved}</p>}
            {offers && <p className="text-base font-bold">{offers}</p>}
          </div>
          <Link
            href={`/${place.kind}/${place.id}`}
            className="flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-base font-extrabold text-deep transition active:scale-95"
          >
            View place
          </Link>
        </div>
      </div>
    </div>
  );
}
