// The /influencers page: what creators get, Free vs Creator Pro, example reel stats, creator waitlist.
// Plans are not built yet. SPEC section 14 has the agreed price (AED 249 a month) but not the list of
// what Creator Pro includes, so the lists below are a first draft to be confirmed by the owner.
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "../pages/PageHeader";
import CreatorForm from "./CreatorForm";
import ContactCta from "../ContactCta";
import { Star, STAR_COLOUR, type StarKind } from "./Stars";
import { FEATURES } from "@/config/features";

const H2 = "text-[clamp(1.9rem,6vw,3.4rem)] font-extrabold leading-[1.05] text-heading";
const CHIP = "inline-block rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep";

// EXAMPLE numbers, to show how the stats will look.
const REELS = [
  { title: "The bowl everyone is saving", place: "Saffron Table", saved: 128, looked: 19, ordered: 41 },
  { title: "Sunday brunch spot", place: "Date & Bean", saved: 86, looked: 14, ordered: 29 },
  { title: "Three outfits, one shop", place: "Thread & Co", saved: 54, looked: 9, ordered: 22 },
];
const MAX = Math.max(...REELS.map((r) => r.saved));

export default function InfluencerPage() {
  return (
    <>
      <PageHeader
        chip="For creators"
        title="See where your reels send people."
        lead="When someone saves a place from your reel, Spotted lets you know. Every save is a star."
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
                <div key={kind} className="rounded-3xl bg-deep p-8 text-white ring-1 ring-lilac/60">
                  <span className="bob inline-block" style={{ "--d": `${i * 0.5}s` } as React.CSSProperties}>
                    <Star kind={kind} size={64} />
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold">{name}</h3>
                  <p className="mt-2 text-lg text-lilac">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Free vs Creator Pro */}
        <section className="bg-alt px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-4xl">
            <span className={CHIP}>Plans</span>
            <h2 className={`${H2} mt-5`}>Free or Creator Pro.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="flex flex-col rounded-3xl border-2 border-lilac bg-page p-8">
                <h3 className="text-2xl font-extrabold text-heading">Free</h3>
                <p className="mt-1 text-4xl font-extrabold text-heading">AED 0</p>
                <ul className="mt-6 grid gap-3 text-lg">
                  <li className="flex gap-3">
                    <Star kind="saved" size={24} />
                    Yellow stars: see when someone saves your reel&rsquo;s place
                  </li>
                </ul>
              </div>
              <div className="flex flex-col rounded-3xl bg-brand p-8 text-white">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-extrabold">Creator Pro</h3>
                  <span className="rounded-full bg-lilac px-3 py-1 text-xs font-extrabold text-deep">2 months free</span>
                </div>
                <p className="mt-1 text-4xl font-extrabold">
                  AED 249<span className="text-xl font-bold text-lilac"> / month</span>
                </p>
                <ul className="mt-6 grid gap-3 text-lg">
                  <li className="flex gap-3">
                    <Star kind="saved" size={24} />
                    Everything in Free
                  </li>
                  <li className="flex gap-3">
                    <Star kind="visitedNoOrder" size={24} />
                    Purple stars: see who visited but did not order
                  </li>
                  <li className="flex gap-3">
                    <Star kind="ordered" size={24} />
                    Green stars: see who visited and ordered
                  </li>
                  <li className="flex gap-3">
                    <Star kind="saved" size={24} />
                    Stats for each reel
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 rounded-3xl bg-box p-6 text-white">
              <p className="text-xl font-extrabold">Your 2 free months are saved.</p>
              <p className="mt-2 text-lg text-lilac">
                During your 2 free months you see every star. All of that data is kept. If you choose to continue, now or weeks
                or months later, your first 2 months are still there and new data carries on from them.
              </p>
            </div>
            <p className="mt-6 text-sm font-bold">Creator plans are coming soon. Plans and prices may change before they open.</p>
          </div>
        </section>

        {/* Example reel stats */}
        <section className="bg-page px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={CHIP}>Reel stats</span>
              <span className="rounded-full bg-deep px-3 py-1 text-xs font-extrabold text-white">EXAMPLE</span>
            </div>
            <h2 className={`${H2} mt-5`}>This is how your stats will look.</h2>
            <ul className="mt-10 grid gap-4">
              {REELS.map((r) => (
                <li key={r.title} className="rounded-3xl bg-deep p-6 text-white ring-1 ring-lilac/60">
                  <p className="text-xl font-extrabold">{r.title}</p>
                  <p className="text-sm font-bold text-lilac">{r.place} (example)</p>
                  <div className="mt-4 grid gap-3">
                    {([
                      ["saved", r.saved, "saved"],
                      ["visitedNoOrder", r.looked, "no order"],
                      ["ordered", r.ordered, "ordered"],
                    ] as [StarKind, number, string][]).map(([kind, n, word]) => (
                      <div key={kind} className="flex items-center gap-3">
                        <Star kind={kind} size={24} />
                        <div className="h-4 flex-1 overflow-hidden rounded-full bg-deep">
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

        {/* Creator waitlist */}
        <section id="waitlist" className="bg-alt px-5 py-20 text-onpage md:py-28">
          <div className="mx-auto max-w-2xl rounded-3xl bg-brand p-8 text-white md:p-12">
            {FEATURES.creatorWaitlist ? (
              <>
                <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Join the creator waitlist.</h2>
                <p className="mb-6 mt-3 text-lg text-lilac">Tell us where you post. We will be in touch before Spotted opens.</p>
                <CreatorForm />
              </>
            ) : (
              <>
                <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Talk to us.</h2>
                <p className="mb-6 mt-3 text-lg text-lilac">
                  Tell us where you post (Instagram, TikTok or YouTube) on WhatsApp. We will be in touch before Spotted opens.
                </p>
                <ContactCta text="Hi Spotted! I am a creator. My handles are: " />
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
