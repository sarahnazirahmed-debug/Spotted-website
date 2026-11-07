// "Your dashboard, on any screen": a DRAWN laptop (maroon side menu, three small number cards, a bar chart,
// two table lines) with a drawn tablet in front showing the "Add a reel" form.
// It never shows real numbers: every number is a dash. The note under it says "Example layout only."
// (The bars have no numbers on them: they only show the shape of a chart.)

export type DashCopy = {
  summary: string; menu: string[]; cards: string[]; chartTitle: string; rows: string[]; rowCols: string[];
  addReel: string; fields: string[]; save: string; note: string;
};
const BARS = [35, 55, 42, 70, 60, 85, 66]; // only the SHAPE of a chart

export default function DashboardDrawing({ t }: { t: DashCopy }) {
  return (
    <figure>
      <p className="sr-only">{t.summary}</p>
      <div aria-hidden="true" className="relative mx-auto max-w-3xl pb-10 text-darktext">
        {/* the laptop */}
        <div className="rounded-t-2xl border-[6px] border-darktext bg-pagebase">
          <div className="grid min-h-64 grid-cols-[28%_1fr]">
            <div className="bg-maroon p-3 text-cream">
              <p className="font-brand text-sm font-bold">Spotted</p>
              <ul className="mt-4 grid gap-2">
                {t.menu.map((m, i) => (
                  <li key={m} className={`rounded-md px-2 py-1 text-[0.65rem] font-semibold sm:text-xs ${i === 0 ? "bg-cream/20" : ""}`}>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 p-3">
              <div className="grid grid-cols-3 gap-2">
                {t.cards.map((c) => (
                  <div key={c} className="rounded-lg border border-rosesoft bg-cream p-2">
                    <p className="text-[0.6rem] font-semibold text-mutedtext sm:text-xs">{c}</p>
                    <p className="font-brand text-lg font-bold sm:text-2xl">-</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-rosesoft bg-cream p-2">
                <p className="text-[0.6rem] font-semibold text-mutedtext sm:text-xs">{t.chartTitle}</p>
                <div className="mt-1 flex h-16 items-end gap-1.5 sm:h-20">
                  {BARS.map((h, i) => (
                    <span key={i} className="flex-1 rounded-t bg-maroon/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                {t.rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-md bg-pinktint px-2 py-1.5 text-[0.6rem] font-semibold sm:text-xs">
                    <span>{r}</span>
                    <span>{t.rowCols[0]}: -</span>
                    <span>{t.rowCols[1]}: -</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-2xl bg-darktext/80" />

        {/* the tablet in front */}
        <div className="absolute -bottom-0 right-2 w-[46%] rotate-0 rounded-2xl border-[5px] border-maroon bg-cream p-3 shadow-2xl sm:right-6">
          <p className="font-brand text-xs font-bold sm:text-sm">{t.addReel}</p>
          <ul className="mt-2 grid gap-1.5">
            {t.fields.map((f) => (
              <li key={f}>
                <span className="block text-[0.55rem] font-semibold text-mutedtext sm:text-[0.65rem]">{f}</span>
                <span className="block rounded-md border border-rosesoft bg-pagebase px-2 py-1 text-[0.6rem] sm:text-xs">-</span>
              </li>
            ))}
          </ul>
          <span className="mt-2 block rounded-full bg-coral py-1 text-center text-[0.6rem] font-bold text-darktext sm:text-xs">{t.save}</span>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-sm font-semibold text-mutedtext">{t.note}</figcaption>
    </figure>
  );
}
