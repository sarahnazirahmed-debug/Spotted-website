// ONE shared design for /restaurants and /shops. Only the words (copy.ts) and the example places change.
// Part A (always on with businessPages): cloth banner "COMING SOON · Restaurants", pitch, waitlist form.
// Part B (businessDirectory, OFF for now): the place directory under the banner.
import { FEATURES } from "@/config/features";
import Hero from "../hero/Hero";
import SiteChrome from "../SiteChrome";
import Directory from "./Directory";
import BusinessForm from "./BusinessForm";
import { COPY } from "./copy";
import { placesFor, type Kind } from "./data";

export default function BusinessPage({ kind }: { kind: Kind }) {
  const c = COPY[kind];
  return (
    <>
      <Hero label="COMING SOON" line2={c.word} />
      <main>
        {FEATURES.businessDirectory && <Directory kind={kind} places={placesFor(kind)} />}

        <section className="bg-page px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-3xl">
            <span className="inline-block rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">
              Spotted for {c.word}
            </span>
            <h2 className="mt-5 text-[clamp(2rem,6.4vw,3.8rem)] font-extrabold leading-[1.05] text-heading">{c.title}</h2>
            <ul className="mt-8 grid gap-4">
              {c.points.map((p) => (
                <li key={p} className="flex gap-3 text-lg leading-relaxed">
                  <svg viewBox="0 0 24 30" width="22" height="28" aria-hidden="true" className="mt-1 shrink-0">
                    <path d="M3 1h18v28l-9-7-9 7z" fill="#E5383B" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="waitlist" className="bg-alt px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-2xl rounded-3xl bg-brand p-8 text-white md:p-12">
            <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Join the waitlist.</h2>
            <p className="mb-6 mt-3 text-lg text-lilac">
              Tell us about your {c.singular}. We will get in touch before Spotted opens.
            </p>
            <BusinessForm kind={kind} />
          </div>
        </section>
      </main>
      <SiteChrome />
    </>
  );
}
