// Shared settings for the scroll story: scene timing, camera shots and captions.
// Everything here is plain numbers and text, so it is easy to tweak.

// The scroll position (0 to 1) is stored here. GSAP writes it, the 3D world reads it.
export const story = { p: 0 };

export type V3 = [number, number, number];

// Where each of the 5 scenes ends on the scroll bar (0 = top, 1 = bottom).
export const SCENE_ENDS = [0.12, 0.38, 0.6, 0.84, 1] as const;
export const SCENE_STARTS = [0, 0.12, 0.38, 0.6, 0.84] as const;
// Inside scene 2 we cut from the phone to the street at this point.
export const PHONE_CUT = 0.45;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const range = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Which scene are we in (i), and how far through it (t, 0 to 1)?
export function sceneAt(p: number) {
  const pc = clamp01(p);
  let i = 0;
  while (i < 4 && pc >= SCENE_ENDS[i]) i++;
  const s = SCENE_STARTS[i];
  return { i, t: clamp01((pc - s) / (SCENE_ENDS[i] - s)) };
}

// Points on the scroll bar where the picture "cuts" (a quick white flash).
export const CUT_POINTS = [
  SCENE_ENDS[0],
  SCENE_STARTS[1] + (SCENE_ENDS[1] - SCENE_STARTS[1]) * PHONE_CUT,
  SCENE_ENDS[1],
  SCENE_ENDS[2],
  SCENE_ENDS[3],
];

// Scene 4 (influencers): six small bookmarks fly from the reel card to the cafe.
export const FLIGHT_COUNT = 6;
export const flightProgress = (t: number, j: number) =>
  range(t, 0.12 + j * 0.1, 0.42 + j * 0.1);

// ---- Camera shots: start and end position + where the camera looks ----
type Shot = { p0: V3; l0: V3; p1: V3; l1: V3 };
const SHOTS: Record<string, Shot> = {
  s0: { p0: [0, 2.2, 5], l0: [0, 1.9, -4], p1: [0.6, 2.1, 1.2], l1: [0, 1.9, -4] },
  phone: { p0: [0.3, 1.6, -9], l0: [0, 1.5, -14], p1: [0, 1.6, -10.2], l1: [0, 1.5, -14] },
  street: { p0: [4, 2.4, -18], l0: [-2.5, 1.4, -30], p1: [3, 2.4, -22], l1: [-3.5, 1.6, -31] },
  s2: { p0: [4, 7, -18], l0: [-7, 3.8, -30], p1: [2, 6.5, -23], l1: [-7, 3.8, -30] },
  s3: { p0: [3, 3.4, -13], l0: [-3.5, 3.6, -26], p1: [2.5, 3.6, -16], l1: [-4, 3.8, -28] },
  s4: { p0: [1, 2.8, -14], l0: [-4, 3.4, -30], p1: [2, 10, 0], l1: [-3, 2, -34] },
};

const mix = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

export function cameraFor(i: number, t: number) {
  let shot = SHOTS["s" + i];
  let u = t;
  if (i === 1) {
    if (t < PHONE_CUT) {
      shot = SHOTS.phone;
      u = t / PHONE_CUT;
    } else {
      shot = SHOTS.street;
      u = (t - PHONE_CUT) / (1 - PHONE_CUT);
    }
  }
  return { pos: mix(shot.p0, shot.p1, u), look: mix(shot.l0, shot.l1, u) };
}

// ---- Captions (shown word by word, like a reel) ----
export const CAPTIONS: { at: number; text: string }[][] = [
  [
    { at: 0, text: "Spot it. Save it." },
    { at: 0.55, text: "Get a nudge when you are near." },
  ],
  [
    { at: 0, text: "You scroll a reel." },
    { at: 0.15, text: "Spot a café you love." },
    { at: 0.3, text: "Tap. Saved." },
    { at: 0.5, text: "Days later, you walk by." },
    { at: 0.8, text: "Spotted nudges you." },
  ],
  [
    { at: 0, text: "Restaurants get saved." },
    { at: 0.4, text: "Offers pulse out to savers." },
    { at: 0.7, text: "Lights on. Tables full." },
  ],
  [
    { at: 0, text: "Influencers post a reel." },
    { at: 0.35, text: "Every save lands at the café." },
    { at: 0.7, text: "Stars climb. Trust grows." },
  ],
  [],
];

export const JOURNEYS: (string | null)[] = [
  null,
  "Journey 1 · You",
  "Journey 2 · Restaurants",
  "Journey 3 · Influencers",
  null,
];

export type Overlay = {
  scene: number;
  step: number;
  words: string[];
  shown: number;
  journey: string | null;
  bubble: boolean;
  hint: boolean;
  end: boolean;
};

// Works out what the on-screen words should look like at scroll position p.
export function overlayFor(p: number): Overlay {
  const { i, t } = sceneAt(p);
  const steps = CAPTIONS[i];
  let step = -1;
  steps.forEach((s, k) => {
    if (t >= s.at) step = k;
  });
  let words: string[] = [];
  let shown = 0;
  if (step >= 0) {
    words = steps[step].text.split(" ");
    const startP = SCENE_STARTS[i] + steps[step].at * (SCENE_ENDS[i] - SCENE_STARTS[i]);
    // one new word roughly every 0.5% of the scroll bar
    shown = Math.min(words.length, Math.floor((p - startP) / 0.005) + 1);
  }
  return {
    scene: i,
    step,
    words,
    shown,
    journey: JOURNEYS[i],
    bubble: i === 1 && t >= 0.82,
    hint: p < 0.03,
    end: i === 4 && t >= 0.2,
  };
}
