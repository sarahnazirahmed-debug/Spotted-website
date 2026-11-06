// Two small charts drawn by hand (no chart library): bars over time, and a list of bars for rankings.
// Colours come from the colours file. Under each chart the page also offers a Table view with the same numbers.
import type { SeriesData } from "@/lib/dashboard/compute";

const COLOURS = ["var(--c-accent)", "var(--c-soft)", "var(--c-leaf)"];
export const seriesColour = (i: number) => COLOURS[i % COLOURS.length];
export const fmt = (n: number, aed = false) => `${aed ? "AED " : ""}${n.toLocaleString("en")}`;

export function BarChart({ labels, series, title }: { labels: string[]; series: SeriesData[]; title: string }) {
  const W = 600;
  const H = 190;
  const base = H - 30;
  const top = 18;
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const max = Math.max(1, ...totals);
  const slot = (W - 12) / n;
  const bw = Math.max(2, slot * 0.7);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: bar chart`} className="w-full text-onpanel">
        <text x="6" y="12" fontSize="11" fill="currentColor" opacity="0.7">
          {fmt(max, series[0]?.aed)}
        </text>
        <line x1="6" x2={W - 6} y1={base} y2={base} stroke="currentColor" opacity="0.3" />
        {labels.map((label, i) => {
          let y = base;
          const x = 6 + i * slot + (slot - bw) / 2;
          return (
            <g key={label}>
              <title>{`${label}: ${series.map((s) => `${s.label} ${fmt(s.values[i], s.aed)}`).join(", ")}`}</title>
              {series.map((s, j) => {
                const h = (s.values[i] / max) * (base - top);
                y -= h;
                return h > 0 ? <rect key={s.id} x={x} y={y} width={bw} height={h} rx="1.5" fill={seriesColour(j)} /> : null;
              })}
            </g>
          );
        })}
        <text x="6" y={H - 8} fontSize="11" fill="currentColor" opacity="0.7">
          {labels[0]}
        </text>
        <text x={W - 6} y={H - 8} fontSize="11" textAnchor="end" fill="currentColor" opacity="0.7">
          {labels[n - 1]}
        </text>
      </svg>
      {series.length > 1 && (
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {series.map((s, j) => (
            <li key={s.id} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ background: seriesColour(j) }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RankBars({ rows, aed }: { rows: { label: string; value: number }[]; aed?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-4 overflow-hidden rounded-full bg-charcoal-deep">
            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--c-accent)" }} />
          </span>
          <span className="w-24 text-right font-extrabold">{fmt(r.value, aed)}</span>
        </li>
      ))}
    </ul>
  );
}
