// The "Rate us" star: plain rules for the star, the card, the bin and the rating. (The look is in src/components/rate/.)

export type About = "website" | "app";
export type Rating = 1 | 2 | 3 | 4 | 5;

// Where things are remembered. "hidden" lasts for good (localStorage). "rated" lasts for this visit only (sessionStorage).
export const KEYS = { hidden: "spotted-star-hidden", rated: "spotted-star-rated", visitor: "spotted-visitor", times: "spotted-rate-times" } as const;

// Something the footer's "Rate us" link sends to open the card.
export const RATE_OPEN_EVENT = "spotted:rate-open";

// A tap moves the finger or mouse by 6 pixels at most. More than that is a DRAG (to the bin).
export const DRAG_LIMIT_PX = 6;
export const isDrag = (dx: number, dy: number) => Math.hypot(dx, dy) > DRAG_LIMIT_PX;

// The close cross stays hidden until the visitor has been still on the card for this long (milliseconds).
export const CROSS_DELAY_MS = { desktop: 2500, phone: 3000 } as const;
export const crossDelay = (phone: boolean) => (phone ? CROSS_DELAY_MS.phone : CROSS_DELAY_MS.desktop);

// After "Thank you" the card closes by itself.
export const AUTO_CLOSE_MS = 5000;

// The browser's own rate limit (the database has one too): at most 3 ratings an hour, and 10 seconds between two.
export const RATE_LIMIT = { max: 3, windowMs: 60 * 60 * 1000, gapMs: 10 * 1000 } as const;
export function rateLimited(times: number[], now: number): "ok" | "gap" | "max" {
  const recent = times.filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) return "max";
  if (recent.some((t) => now - t < RATE_LIMIT.gapMs)) return "gap";
  return "ok";
}

// The hidden honeypot box: people never see it, so it stays empty. A robot fills it in.
export const isHoneypotFilled = (value: string) => value.trim() !== "";

export const NOTE_MAX = 300; // what the box allows (the database allows 500)
export const cleanNote = (value: string): string | null => value.trim().slice(0, 500) || null;

// A random code for this browser. Nothing about the person; only used for the rate limit.
export function newVisitorKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The row that is sent. (No id and no date: the database makes those.)
export function buildRow(a: { about: About; rating: Rating; note: string; page: string; visitor: string }) {
  return { about: a.about, rating: a.rating, note: cleanNote(a.note), page: a.page.slice(0, 200) || null, visitor_key: a.visitor };
}

// Is the middle of the star over the bin? (a little generous, so it is easy to hit)
export type Box = { left: number; top: number; right: number; bottom: number };
export function overBin(star: Box, bin: Box, slack = 12): boolean {
  const x = (star.left + star.right) / 2;
  const y = (star.top + star.bottom) / 2;
  return x >= bin.left - slack && x <= bin.right + slack && y >= bin.top - slack && y <= bin.bottom + slack;
}

// The five faces: only a mouth in a round outline. NO EYES. 1 is the unhappiest, 5 the happiest.
export const MOUTHS: Record<Rating, string> = {
  1: "M7 17 Q12 10.500 17 17",
  2: "M8 16 Q12 12.500 16 16",
  3: "M8 14.500 H16",
  4: "M8 13 Q12 17 16 13",
  5: "M7 12 Q12 21 17 12 Z",
};
export const RATINGS: Rating[] = [1, 2, 3, 4, 5];
