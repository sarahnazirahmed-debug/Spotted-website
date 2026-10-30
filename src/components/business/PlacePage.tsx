// The place page (Part B). ONE design for restaurants and shops.
// Video, photos, location map + Directions, offers, influencer reels, "Open in Spotted app".
import Link from "next/link";
import DishMedia from "./DishMedia";
import SiteChrome from "../SiteChrome";
import { COPY } from "./copy";
import { offersLabel, savedLabel, type Place } from "./data";

const H3 = "text-2xl font-extrabold leading-tight text-heading";

export default function PlacePage({ place }: { place: Place }) {
  const c = COPY[place.kind];
  const saved = savedLabel(place.saves);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.coords.lat},${place.coords.lng}`;
  return (
    <>
      <main className="bg-page px-5 pb-24 pt-24 text-onpage">
        <div className="mx-auto max-w-3xl">
          <Link href={`/${place.kind}`} className="inline-flex min-h-11 items-center text-sm font-extrabold text-heading underline">
            &larr; All {c.word.toLowerCase()}
          </Link>

          {/* video */}
          <DishMedia place={place} active className="mt-3 aspect-[16/10] w-full rounded-3xl" />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-tight text-heading">{place.name}</h1>
            {place.partner && (
              <span className="rounded-full bg-lilac px-3 py-1 text-xs font-extrabold text-deep">Spotted Partner</span>
            )}
          </div>
          <p className="mt-1 text-lg font-bold">
            {place.area}, {place.emirate} · {place.category}
            {saved ? ` · Saved by ${saved}` : ""}
          </p>
          <p className="mt-4 text-lg leading-relaxed">{place.blurb}</p>
          <p className="mt-2 text-sm font-bold">This place is an example, to show how the page will look.</p>

          {/* photos */}
          <h2 className={`${H3} mt-12`}>Photos</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[1, 1.5, 0.8].map((z) => (
              <DishMedia key={z} place={place} zoom={z} className="aspect-square rounded-2xl" />
            ))}
          </div>

          {/* map + directions */}
          <h2 className={`${H3} mt-12`}>Where to find it</h2>
          <div className="mt-4 overflow-hidden rounded-3xl bg-box p-4 text-white">
            <svg viewBox="0 0 320 180" role="img" aria-label={`Map of ${place.area}`} className="w-full rounded-2xl">
              <rect width="320" height="180" fill="#3C096C" />
              <path d="M0 120C80 100 140 150 320 90" fill="none" stroke="#6A1FB0" strokeWidth="24" />
              <path d="M110 0C130 70 90 110 120 180" fill="none" stroke="#6A1FB0" strokeWidth="20" />
              <path d="M160 128C138 98 132 84 132 74a28 28 0 0 1 56 0c0 10-6 24-28 54z" fill="#E5383B" stroke="#FFFFFF" strokeWidth="4" />
            </svg>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">
                {place.area}, {place.emirate}
              </p>
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center rounded-full bg-white px-6 font-extrabold text-deep transition active:scale-95"
              >
                Directions
              </a>
            </div>
          </div>

          {/* offers */}
          <h2 className={`${H3} mt-12`}>Offers {offersLabel(place.offers.length) ? `(${offersLabel(place.offers.length)})` : ""}</h2>
          {place.offers.length === 0 ? (
            <p className="mt-3">No offers right now.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {place.offers.map((o) => (
                <li key={o} className="rounded-2xl bg-alt p-4 text-lg font-bold">
                  {o}
                </li>
              ))}
            </ul>
          )}

          {/* influencer reels */}
          <h2 className={`${H3} mt-12`}>Influencer reels about this place</h2>
          {place.reels.length === 0 ? (
            <p className="mt-3">No reels yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {place.reels.map((r) => (
                <li key={r.title} className="flex items-center gap-4 rounded-2xl bg-box p-4 text-white">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path d="M8 5l12 7-12 7z" fill="#E5383B" />
                    </svg>
                  </span>
                  <span>
                    <span className="block font-extrabold">{r.title}</span>
                    <span className="text-sm font-bold text-lilac">{r.handle} (example)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <a
            href={`spotted://place/${place.id}`}
            className="mt-14 flex min-h-14 items-center justify-center rounded-full bg-brand px-8 text-lg font-extrabold text-white transition active:scale-95"
          >
            Open in Spotted app
          </a>
        </div>
      </main>
      <SiteChrome />
    </>
  );
}
