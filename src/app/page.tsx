import HeroScene from "@/components/HeroScene";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-brand text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-12 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">
              Coming soon
            </p>
            <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
              Spotted
            </h1>
            <p className="mt-4 max-w-md text-lg font-medium text-lilac">
              Save the places you spot. Get a little nudge when you are nearby.
            </p>
            <a
              href="#how"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-sun px-8 font-bold text-deep transition active:scale-95"
            >
              See how it works
            </a>
          </div>
          <div className="h-80 md:h-[28rem]">
            <HeroScene />
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <h2 className="text-3xl font-extrabold text-deep md:text-4xl">
          How it works
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["1. Spot", "See a place you like? Save it in a few taps."],
            ["2. Remember", "Your places live on your phone, kept private."],
            ["3. Get nudged", "Walk past a saved place and Spotted tells you."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl bg-lilac/40 p-6">
              <h3 className="text-xl font-bold text-brand">{title}</h3>
              <p className="mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-deep px-5 py-8 text-center text-sm text-lilac">
        Spotted
      </footer>
    </main>
  );
}
