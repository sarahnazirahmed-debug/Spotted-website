// The "What's Spotted" page, right under the landing section.
// Five short sections, big Poppins headlines, ONE simple animation each (objects only: no people).
// The animations are CSS loops in globals.css. With Reduce Motion they stop and show a still picture.
// Only promise what the app really does at launch (see SPEC.md): save from a reel, saved list,
// map, nearby alerts (200 m, 300 m, 500 m or 1 km), settings.
import Waitlist from "./Waitlist";
import ContactCta from "./ContactCta";
import { FEATURES } from "@/config/features";

const H2 = "text-[clamp(2rem,6.4vw,3.8rem)] font-extrabold leading-[1.05] text-heading";
const CHIP = "inline-block rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep";
const BODY = "mt-5 max-w-xl text-lg leading-relaxed";
const WRAP = "mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2";

// 1. A phone showing a reel, and saves that pile up below it... then fade.
function ForgottenArt() {
  return (
    <svg viewBox="0 0 320 340" role="img" aria-label="A phone showing a reel, with saved bookmarks piling up and fading" className="mx-auto w-full max-w-sm">
      <rect x="100" y="6" width="120" height="210" rx="22" fill="#3C096C" stroke="#C9A2FF" strokeWidth="5" />
      <rect x="112" y="22" width="96" height="178" rx="12" fill="#6A1FB0" />
      <rect x="140" y="92" width="40" height="40" rx="12" fill="#FFFFFF" />
      <path d="M154 102l16 10-16 10z" fill="#E5383B" />
      <rect x="20" y="300" width="280" height="10" rx="5" fill="#C9A2FF" />
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k} transform={`translate(${34 + k * 54} 252)`}>
          <g className="bm-drop" style={{ "--d": `${k * 0.7}s` } as React.CSSProperties}>
            <path d="M3 1h24v38l-12-9-12 9z" fill="#E5383B" />
          </g>
        </g>
      ))}
    </svg>
  );
}

// 2. Step cards. The numbers light up one after another.
const STEPS = [
  {
    n: 1,
    title: "See it in a reel",
    text: "You spot a place you like in a reel or a video.",
    art: (
      <svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24">
        <rect x="32" y="8" width="56" height="104" rx="12" fill="#3C096C" stroke="#C9A2FF" strokeWidth="4" />
        <rect x="46" y="44" width="28" height="28" rx="9" fill="#FFFFFF" />
        <path d="M56 51l11 7-11 7z" fill="#E5383B" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Save it to Spotted",
    text: "Share the reel to Spotted and confirm the place. It goes into your saved list and onto your map.",
    art: (
      <svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24">
        <path d="M30 10h60v100l-30-24-30 24z" fill="#E5383B" />
        <path d="M60 78C46 62 44 54 44 49a16 16 0 0 1 32 0c0 5-2 13-16 29z" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Get a nudge when you're near",
    text: "Spotted sends you a notification when you get close to a saved place, even with the app closed. You choose how close: 200 m, 300 m, 500 m or 1 km.",
    art: (
      <svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24">
        {[0, 1.2, 2.4].map((d) => (
          <circle key={d} cx="60" cy="64" r="52" fill="none" stroke="#C9A2FF" strokeWidth="4" className="ring-out" style={{ "--d": `${d}s` } as React.CSSProperties} />
        ))}
        <path d="M60 100C40 76 36 64 36 56a24 24 0 0 1 48 0c0 8-4 20-24 44z" fill="#E5383B" />
      </svg>
    ),
  },
];

// 3. Eat, Shop, Play tiles that bob.
const TILES = [
  {
    name: "Eat",
    art: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-14 w-14">
        <ellipse cx="32" cy="36" rx="26" ry="10" fill="#FFFFFF" />
        <ellipse cx="32" cy="32" rx="18" ry="6" fill="#C9A2FF" />
        <path d="M14 20q4-8 0-14M32 18q4-8 0-14M50 20q4-8 0-14" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Shop",
    art: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-14 w-14">
        <path d="M14 22h36l4 36H10z" fill="#FFFFFF" />
        <path d="M22 26v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#C9A2FF" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Play",
    art: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-14 w-14">
        <path d="M32 6l7 16 17 1.5-13 11 4 17L32 42 17 51.500l4-17-13-11L25 22z" fill="#FFD23F" />
      </svg>
    ),
  },
];

// 4. A little map with a pin and rings.
function MapArt() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="A map with a pin in Khalifa City" className="mx-auto w-full max-w-sm">
      <rect x="10" y="10" width="300" height="280" rx="28" fill="#3C096C" />
      <path d="M10 190C90 170 140 220 310 150" fill="none" stroke="#6A1FB0" strokeWidth="26" />
      <path d="M120 10C140 90 100 150 130 290" fill="none" stroke="#6A1FB0" strokeWidth="22" />
      <path d="M10 190C90 170 140 220 310 150" fill="none" stroke="#C9A2FF" strokeWidth="3" strokeDasharray="12 12" />
      <path d="M120 10C140 90 100 150 130 290" fill="none" stroke="#C9A2FF" strokeWidth="3" strokeDasharray="12 12" />
      {[0, 1.2, 2.4].map((d) => (
        <circle key={d} cx="170" cy="150" r="110" fill="none" stroke="#C9A2FF" strokeWidth="4" className="ring-out" style={{ "--d": `${d}s` } as React.CSSProperties} />
      ))}
      <path d="M170 196C140 158 134 140 134 128a36 36 0 0 1 72 0c0 12-6 30-36 68z" fill="#E5383B" />
      <path d="M170 196C140 158 134 140 134 128a36 36 0 0 1 72 0c0 12-6 30-36 68z" fill="none" stroke="#FFFFFF" strokeWidth="5" />
    </svg>
  );
}

export default function WhatsSpotted() {
  return (
    <main id="whats-spotted" className="relative">
      {/* 1. Why we made it */}
      <section className="bg-page px-5 py-20 text-onpage md:py-28">
        <div className={WRAP}>
          <div>
            <span className={CHIP}>Why we made it</span>
            <h2 className={`${H2} mt-5`}>You save places from reels... and forget them.</h2>
            <p className={BODY}>
              Cafés, shops, things to do. They pile up in your saves, and when you walk right past one, you do not
              remember it is there.
            </p>
          </div>
          <ForgottenArt />
        </div>
      </section>

      {/* 2. How it works */}
      <section className="bg-alt px-5 py-20 text-onpage md:py-28">
        <div className="mx-auto max-w-5xl">
          <span className={CHIP}>How it works</span>
          <h2 className={`${H2} mt-5`}>Three easy steps.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="flex flex-col items-start gap-4 rounded-3xl bg-box p-6 text-white">
                <div className="flex w-full items-center justify-between">
                  <span
                    className="step-glow flex size-12 items-center justify-center rounded-full bg-lilac text-xl font-extrabold text-deep"
                    style={{ "--d": `${i * 2}s` } as React.CSSProperties}
                  >
                    {s.n}
                  </span>
                  {s.art}
                </div>
                <h3 className="text-2xl font-extrabold leading-tight">{s.title}</h3>
                <p className="text-base leading-relaxed text-lilac">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-bold text-heading">
            For nudges with the app closed, allow location &ldquo;Always&rdquo; when Spotted asks.
          </p>
        </div>
      </section>

      {/* 3. Never miss out */}
      <section className="bg-page px-5 py-20 text-onpage md:py-28">
        <div className={WRAP}>
          <div>
            <span className={CHIP}>Never miss out</span>
            <h2 className={`${H2} mt-5`}>Eat. Shop. Play.</h2>
            <p className={BODY}>
              Sort every place into Eat, Shop or Play. Make your own lists too, like weekend plans or hidden gems, and
              keep them all in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TILES.map((t, i) => (
              <div
                key={t.name}
                className="bob flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl bg-brand text-white"
                style={{ "--d": `${i * 0.5}s` } as React.CSSProperties}
              >
                {t.art}
                <span className="text-lg font-extrabold">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Made in the UAE */}
      <section className="bg-alt px-5 py-20 text-onpage md:py-28">
        <div className={WRAP}>
          <div>
            <span className={CHIP}>Made in the UAE</span>
            <h2 className={`${H2} mt-5`}>Launching in Khalifa City, Abu Dhabi.</h2>
            <p className={BODY}>
              Khalifa City is where we start. Spotted works wherever you are.
            </p>
          </div>
          <MapArt />
        </div>
      </section>

      {/* 5. Notify me */}
      <section id="waitlist" className="bg-page px-5 py-20 text-onpage md:py-28">
        <div className="mx-auto max-w-2xl rounded-3xl bg-brand p-8 text-center text-white md:p-12">
          <h2 className="text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-tight">Be the first to know.</h2>
          {FEATURES.waitlist ? (
            <>
              <p className="mb-6 mt-3 text-lg text-lilac">Leave your email and we will tell you when Spotted opens.</p>
              <Waitlist label="Notify me" />
            </>
          ) : (
            <>
              <p className="mb-6 mt-3 text-lg text-lilac">Message us on WhatsApp and we will tell you when Spotted opens.</p>
              <div className="flex justify-center">
                <ContactCta text="Hi Spotted! Please tell me when the app opens." label="Notify me on WhatsApp" />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
