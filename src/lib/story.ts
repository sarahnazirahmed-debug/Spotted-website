// Shared settings for the scroll stories: which story, key words, helpers.
// Everything here is plain numbers and text, so it is easy to tweak.

export type V3 = [number, number, number];
export type StoryId = "you" | "influencer" | "restaurant";

// The scroll position (0 to 1) is stored here. GSAP writes it, the 3D world reads it.
export const story = { p: 0 };

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// The three stories. heightVh = how long the page is (longer = slower story).
export const STORY_LIST: { id: StoryId; label: string; heightVh: number; endAt: number }[] = [
  { id: "you", label: "You", heightVh: 1500, endAt: 0.95 },
  { id: "influencer", label: "Influencer", heightVh: 1400, endAt: 0.95 },
  { id: "restaurant", label: "Restaurant", heightVh: 800, endAt: 0.88 },
];

// ---- Key words (not subtitles): short words that pop up on different sides of the screen ----
// x, y = where the word sits, in percent of the screen (50, 50 is the middle).
export type KeyWord = {
  at: number;
  to: number;
  text: string;
  x: number;
  y: number;
  tone?: "white" | "sun" | "red" | "lilac";
  big?: boolean;
  rot?: number;
};

export const KEYWORDS: Record<StoryId, KeyWord[]> = {
  you: [
    { at: 0.0, to: 0.09, text: "SPOT", x: 24, y: 22, big: true },
    { at: 0.025, to: 0.09, text: "SAVE", x: 76, y: 38, tone: "sun", rot: 4 },
    { at: 0.17, to: 0.26, text: "SCROLL", x: 70, y: 24, rot: -3 },
    { at: 0.2, to: 0.3, text: "REELS", x: 26, y: 72, tone: "lilac" },
    { at: 0.28, to: 0.37, text: "SAVED", x: 72, y: 70, tone: "sun", big: true, rot: 3 },
    { at: 0.4, to: 0.47, text: "DAY 1", x: 24, y: 22, big: true },
    { at: 0.49, to: 0.56, text: "DAY 2", x: 76, y: 22, big: true },
    { at: 0.58, to: 0.65, text: "DAY 3", x: 24, y: 22, big: true },
    { at: 0.68, to: 0.76, text: "LATER", x: 74, y: 24, tone: "lilac" },
    { at: 0.77, to: 0.88, text: "1 KM", x: 24, y: 70, tone: "sun", big: true, rot: -3 },
    { at: 0.9, to: 0.95, text: "ARRIVED", x: 50, y: 18, tone: "sun", big: true },
  ],
  influencer: [
    { at: 0.0, to: 0.1, text: "CREATE", x: 24, y: 22, big: true },
    { at: 0.06, to: 0.12, text: "REEL", x: 76, y: 70, tone: "sun" },
    { at: 0.16, to: 0.33, text: "KMS APART", x: 50, y: 16, tone: "lilac", big: true },
    { at: 0.34, to: 0.41, text: "SCROLL", x: 72, y: 24 },
    { at: 0.4, to: 0.47, text: "SAVE", x: 26, y: 70, tone: "sun", big: true },
    { at: 0.5, to: 0.64, text: "GOES THERE", x: 50, y: 14, tone: "lilac", big: true },
    { at: 0.68, to: 0.79, text: "NO CREDIT", x: 28, y: 22, tone: "red", big: true, rot: -3 },
    { at: 0.8, to: 0.87, text: "SPOTTED", x: 74, y: 24, tone: "sun", big: true, rot: 3 },
    { at: 0.86, to: 0.95, text: "CREDIT", x: 26, y: 72, tone: "sun", big: true },
  ],
  restaurant: [
    { at: 0.04, to: 0.22, text: "SAVED", x: 24, y: 22, big: true },
    { at: 0.3, to: 0.48, text: "OFFERS", x: 74, y: 24, tone: "sun", big: true },
    { at: 0.55, to: 0.74, text: "FULL", x: 26, y: 72, tone: "lilac", big: true },
  ],
};

// When the "1 km away" notification is on screen (only in "You").
export const NOTIFY: Partial<Record<StoryId, [number, number]>> = { you: [0.77, 0.88] };

export type Overlay = {
  active: number[];
  bubble: boolean;
  hint: boolean;
  end: boolean;
};

export function overlayFor(id: StoryId, p: number): Overlay {
  const active: number[] = [];
  KEYWORDS[id].forEach((k, i) => {
    if (p >= k.at && p < k.to) active.push(i);
  });
  const n = NOTIFY[id];
  const endAt = STORY_LIST.find((s) => s.id === id)!.endAt;
  return {
    active,
    bubble: !!n && p >= n[0] && p < n[1],
    hint: p < 0.025,
    end: p >= endAt,
  };
}

// 0 = night, 1 = day. In "You", three days and nights pass between p = 0.40 and 0.66.
export function dayFactor(id: StoryId, p: number) {
  if (id !== "you") return 0;
  const c = range(p, 0.4, 0.66) * 3; // 0 to 3 days
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * c);
}
