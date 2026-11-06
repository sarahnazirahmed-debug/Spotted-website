// The /insider page: "Spotted Insider", the PAID plan for creators (AED 249 a month, first 2 months free).
// There is no free plan on the website, and creators who do not pay get nothing shown on the site.
// SPEC section 14 has the price but not the full list of what Insider includes, so the list below is a
// first draft to be confirmed by the owner.
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "../pages/PageHeader";
import InsiderForm from "./InsiderForm";
import ContactCta from "../ContactCta";
import { Star, STAR_COLOUR, type StarKind } from "./Stars";
import { FEATURES } from "@/config/features";

const H2 = "text-[clamp(1.9rem,6vw,3.4rem)] font-extrabold leading-[1.05] text-heading";
const CHIP = "inline-block rounded-full bg-chip px-4 py-1 text-sm font-bold text-charcoal";

// EXAMPLE numbers, to show how the stats will look.
const REELS = [
  { title: "The bowl everyone is saving", place: "Saffron Table", saved: 128, looked: 19, ordered: 41 },
  { title: "Sunday brunch spot", place: "Date & Bean", saved: 86, looked: 14, ordered: 29 },
  { title: "Three outfits, one shop", place: "Thread & Co", saved: 54, looked: 9, ordered: 22 },
];
const MAX = Math.max(...REELS.map((r) => r.saved));

export default function InsiderPage() {
  return (
    <>
      <PageHeader
        chip="Spotted Insider"
        title="See where your reels send people."
        lead="Spotted Insider is the paid plan for creators. See when someone saves, visits or orders from the places in your reels."
      />
      <main>
        {/* What creators get */}
        <section className="bg-page px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-4xl">
            <span className={CHIP}>What you get</span>
            <h2 className={`${H2} mt-5`}>Three stars. Three kinds of proof.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {(
                [
                  ["saved", "Yellow star", "Someone saved your reel\u2019s place."],
                  ["visitedNoOrder", "Purple star", "Someone visited but did not order."],
                  ["ordered", "Green star", "Someone visited and ordered."],
                ] as [StarKind, string, string][]
              ).map(([kind, name, text], i) => (
                <div key={kind} className="rounded-3xl bg-charcoal p-8 text-paper ring-1 ring-line/60">
                  <span className="bob inline-block" style={{ "--d": `${i * 0.5}s` } as React.CSSProperties}>
                    <Star kind={kind} size={64} />
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold">{name}</h3>
                  <p className="mt-2 text-lg text-mist">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Insider plan: paid only */}
        <section className="bg-alt px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-4xl">
            <span className={CHIP}>The plan</span>
            <h2 className={`${H2} mt-5`}>Spotted Insider.</h2>
            <div className="mt-10 max-w-xl rounded-3xl bg-panel p-8 text-onpanel">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-extrabold">Spotted Insider</h3>
                <span className="rounded-full bg-chip px-3 py-1 text-xs font-extrabold text-charcoal">First 2 months free</span>
              </div>
              <p className="mt-1 text-4xl font-extrabold">
                AED 249<span className="text-xl font-bold text-mist"> / month</span>
              </p>
              <ul className="mt-6 grid gap-3 text-lg">
                <li className="flex gap-3">
                  <Star kind="saved" size={24} />
                  Yellow stars: someone saved your reel&rsquo;s place
                </li>
                <li className="flex gap-3">
                  <Star kind="visitedNoOrder" size={24} />
                  Purple stars: someone visited but did not order
                </li>
                <li className="flex gap-3">
                  <Star kind="ordered" size={24} />
                  Green stars: someone visited and ordered
                </li>
                <li className="flex gap-3">
                  <Star kind="saved" size={24} />
                  Stats for each reel
                </li>
              </ul>
            </div>
            <div className="mt-8 max-w-xl rounded-3xl bg-box p-6 text-onpanel">
              <p className="text-xl font-extrabold">Your 2 free months are saved.</p>
              <p className="mt-2 text-lg text-mist">
                During your first 2 months you see every star, and all of that data is kept. If you choose to continue, now or
                weeks or months later, your first 2 months are still there and new data carries on from them.
              </p>
            </div>
            <p className="mt-6 text-sm font-bold">Spotted Insider is coming soon. The plan and the price may change before it opens.</p>
          </div>
        </section>

        {/* Example reel stats */}
        <section className="bg-page px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={CHIP}>Reel stats</span>
              <span className="rounded-full bg-charcoal px-3 py-1 text-xs font-extrabold text-paper">EXAMPLE</span>
            </div>
            <h2 className={`${H2} mt-5`}>This is how your stats will look.</h2>
            <ul className="mt-10 grid gap-4">
              {REELS.map((r) => (
                <li key={r.title} className="rounded-3xl bg-charcoal p-6 text-paper ring-1 ring-line/60">
                  <p className="text-xl font-extrabold">{r.title}</p>
                  <p className="text-sm font-bold text-mist">{r.place} (example)</p>
                  <div className="mt-4 grid gap-3">
                    {([
                      ["saved", r.saved, "saved"],
                      ["visitedNoOrder", r.looked, "no order"],
                      ["ordered", r.ordered, "ordered"],
                    ] as [StarKind, number, string][]).map(([kind, n, word]) => (
                      <div key={kind} className="flex items-center gap-3">
                        <Star kind={kind} size={24} />
                        <div className="h-4 flex-1 overflow-hidden rounded-full bg-charcoal">
                          <div className="h-full rounded-full" style={{ width: `${(n / MAX) * 100}%`, background: STAR_COLOUR[kind] }} />
                        </div>
                        <span className="w-28 text-right font-extrabold">
                          {n} {word}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Insider waitlist */}
        <section id="waitlist" className="bg-alt px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-2xl rounded-3xl bg-panel p-8 text-paper md:p-12">
            {FEATURES.insiderWaitlist ? (
              <>
                <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Join the Insider waitlist.</h2>
                <p className="mb-6 mt-3 text-lg text-mist">Tell us where you post. We will be in touch before Spotted opens.</p>
                <InsiderForm />
              </>
            ) : (
              <>
                <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Talk to us.</h2>
                <p className="mb-6 mt-3 text-lg text-mist">
                  Tell us on WhatsApp where you post (Instagram, TikTok or YouTube) and that you want Spotted Insider. We will be in touch.
                </p>
                <ContactCta text="Hi Spotted! I would like to join Spotted Insider. My handles are: " />
              </>
            )}
          </div>
        </section>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
