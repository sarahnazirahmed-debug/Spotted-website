// Shared settings for the scroll story: scene timing, camera shots and captions.
// Everything here is plain numbers and text, so it is easy to tweak.

// The scroll position (0 to 1) is stored here. GSAP writes it, the 3D world reads it.
export const story = { p: 0 };

export type V3 = [number, number, number];

// Where each of the 5 scenes ends on the scroll bar (0 = top, 1 = bottom).
export const SCENE_ENDS = [0.12, 0.38, 0.6, 0.84, 1] as const;
export const SCENE_STARTS = [0, 0.12, 0.38, 0.6, 0.84] as const;
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

// Scene 4 (influencers): six small bookmarks fly from the reel card to the cafe.
export const FLIGHT_COUNT = 6;
export const flightProgress = (t: number, j: number) =>
  range(t, 0.12 + j * 0.1, 0.42 + j * 0.1);

// ---- Camera path: ONE smooth ride down the street (no cuts) ----
// Each waypoint is: scroll position, camera position, where the camera looks.
const WAY: [number, V3, V3][] = [
  [0.0, [0, 2.2, 5], [0, 1.9, -4]],
  [0.08, [1.4, 2.1, -2], [0, 1.8, -10]],
  [0.17, [0.3, 1.6, -10.2], [0, 1.5, -14]], // close to the phone
  [0.24, [1.8, 1.9, -12.8], [-0.5, 1.4, -21]], // glide past the phone
  [0.3, [3.5, 2.4, -17.5], [-2.5, 1.4, -28]],
  [0.38, [3.2, 2.6, -21], [-4, 2, -30]], // the dot walks past the cafe
  [0.47, [3.5, 5.2, -20], [-7, 3.8, -30]], // rise up to see the roof
  [0.55, [3, 6.8, -21.5], [-7, 3.8, -30]],
  [0.62, [3, 4.8, -17], [-5, 3.6, -28]], // come back down to the street
  [0.72, [2.8, 3.5, -15], [-3.8, 3.7, -27]],
  [0.84, [2.5, 3.6, -16], [-4, 3.8, -28]],
  [0.92, [1.5, 6, -10], [-4, 3, -31]],
  [1.0, [2, 10, 0], [-3, 2, -34]],
];

// Catmull-Rom: a smooth curve that passes through every waypoint.
const cr = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 *
  (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

export function cameraFor(p: number) {
  const pc = clamp01(p);
  let k = 0;
  while (k < WAY.length - 2 && pc >= WAY[k + 1][0]) k++;
  const u = range(pc, WAY[k][0], WAY[k + 1][0]);
  const i0 = Math.max(0, k - 1);
  const i3 = Math.min(WAY.length - 1, k + 2);
  const at = (sel: 1 | 2): V3 => [0, 1, 2].map((c) =>
    cr(WAY[i0][sel][c], WAY[k][sel][c], WAY[k + 1][sel][c], WAY[i3][sel][c], u),
  ) as V3;
  return { pos: at(1), look: at(2) };
}

// ---- Captions (shown word by word, like a reel). `at` is the scroll position. ----
export const CAPTIONS: { at: number; text: string }[] = [
  { at: 0, text: "Spot it. Save it." },
  { at: 0.06, text: "Get a nudge when you are near." },
  { at: 0.12, text: "You scroll a reel." },
  { at: 0.17, text: "Spot a café you love." },
  { at: 0.21, text: "Tap. Saved." },
  { at: 0.28, text: "Days later, you walk by." },
  { at: 0.35, text: "Spotted nudges you." },
  { at: 0.4, text: "Restaurants get saved." },
  { at: 0.47, text: "Offers pulse out to savers." },
  { at: 0.54, text: "Lights on. Tables full." },
  { at: 0.62, text: "Influencers post a reel." },
  { at: 0.7, text: "Every save lands at the café." },
  { at: 0.78, text: "Stars climb. Trust grows." },
];

export type Overlay = {
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
  let step = -1;
  CAPTIONS.forEach((c, k) => {
    if (p >= c.at) step = k;
  });
  let words: string[] = [];
  let shown = 0;
  // After the last caption the box goes away so the ending can take over.
  if (step >= 0 && p < 0.86) {
    words = CAPTIONS[step].text.split(" ");
    // one new word roughly every 0.5% of the scroll bar
    shown = Math.min(words.length, Math.floor((p - CAPTIONS[step].at) / 0.005) + 1);
  }
  const journey =
    p >= 0.12 && p < 0.38
      ? "Journey 1 · You"
      : p >= 0.38 && p < 0.6
        ? "Journey 2 · Restaurants"
        : p >= 0.6 && p < 0.84
          ? "Journey 3 · Influencers"
          : null;
  return {
    step,
    words,
    shown,
    journey,
    bubble: p >= 0.35 && p < 0.46,
    hint: p < 0.03,
    end: p >= 0.88,
  };
}
