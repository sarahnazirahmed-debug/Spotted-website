// One dashboard card: title, a label saying if the numbers are real or EXAMPLE, the totals, and a graph or a table.
import { seriesTotal, type CardData } from "@/lib/dashboard/compute";
import { cardToTable } from "@/lib/dashboard/export";
import { GRANULARITY_LABEL, type Granularity } from "@/lib/dashboard/time";
import { BarChart, fmt, RankBars, seriesColour } from "./Chart";

export function SourceBadge({ source }: { source: "real" | "example" }) {
  return source === "real" ? (
    <span className="rounded-full bg-chip px-3 py-1 text-xs font-extrabold text-onchip">Real data</span>
  ) : (
    <span className="rounded-full bg-accent px-3 py-1 text-xs font-extrabold text-onaccent">EXAMPLE data</span>
  );
}

export function DataTable({ header, rows }: { header: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[18rem] text-left text-sm">
        <thead>
          <tr className="text-mist">
            {header.map((h) => (
              <th key={h} className="p-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className={`p-2 ${j > 0 ? "text-right tabular-nums" : ""}`}>
                  {typeof c === "number" ? c.toLocaleString("en") : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CardView({ data, view, granularity, children }: { data: CardData; view: "graph" | "table"; granularity: Granularity; children?: React.ReactNode }) {
  const c = data.card;
  const table = cardToTable(data);
  return (
    <article className="rounded-3xl bg-box p-5 text-onpanel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-xl font-extrabold leading-tight">{c.title}</h3>
        {c.money && <span className="rounded-full border-2 border-line px-3 py-1 text-xs font-extrabold">Money: main admin and associates</span>}
        <SourceBadge source={data.source} />
      </div>
      {c.help && <p className="mt-1 text-sm text-mist">{c.help}</p>}
      <p className="mb-3 mt-1 text-xs font-bold text-mist">{GRANULARITY_LABEL[granularity]}</p>

      {data.kind === "series" && (
        <>
          <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
            {data.series.map((s, i) => (
              <div key={s.id}>
                <dt className="flex items-center gap-2 text-xs text-mist">
                  {data.series.length > 1 && <span aria-hidden="true" className="inline-block size-2.5 rounded-sm" style={{ background: seriesColour(i) }} />}
                  {s.label}
                </dt>
                <dd className="text-2xl font-extrabold">{fmt(seriesTotal(s), s.aed)}</dd>
              </div>
            ))}
          </dl>
          {view === "graph" ? <BarChart labels={data.labels} series={data.series} title={c.title} /> : table && <DataTable header={table.header} rows={table.rows} />}
        </>
      )}
      {data.kind === "breakdown" && (view === "graph" ? <RankBars rows={data.rows} aed={data.aed} /> : table && <DataTable header={table.header} rows={table.rows} />)}
      {children}
    </article>
  );
}
