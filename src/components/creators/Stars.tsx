// The three creator stars.
//  yellow = someone saved your reel's place
//  purple = someone visited but did not order
//  green  = someone visited and ordered
const PATH = "M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.7 5.6 21.5l1.7-7.2L2 9.6 9 9z";
// visit / sale: the two stars of the new Insider page (green = visits, yellow = sales).
export type StarKind = "saved" | "visitedNoOrder" | "ordered" | "visit" | "sale";

export const STAR_COLOUR: Record<StarKind, string> = {
  saved: "var(--star-saved)",
  visitedNoOrder: "var(--star-visited)",
  ordered: "var(--star-ordered)",
  visit: "var(--visit-green)",
  sale: "var(--sales-yellow)",
};

export function Star({ kind, size = 28 }: { kind: StarKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {/* a thin white edge keeps the purple star visible on purple backgrounds */}
      <path d={PATH} fill={STAR_COLOUR[kind]} stroke="var(--c-paper)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
