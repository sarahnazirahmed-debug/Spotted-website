// The flat 2D world: where things are, how the camera glides, and where the cars drive.
// Units are "world pixels". x goes right, y goes DOWN. One smooth camera ride per story.
import { clamp01, range, smooth, lerp, type StoryId } from "./story";

// ---- Palette ----
export const C = {
  brand: "#6A1FB0",
  deep: "#3C096C",
  red: "#E5383B",
  lilac: "#C9A2FF",
  yellow: "#FFD23F",
  white: "#FFFFFF",
};

// ---- Places in the world ----
export const WIN_A = { x: 550, y: 430, w: 240, h: 250 }; // customer / influencer window
export const WIN_B = { x: 2300, y: 430, w: 240, h: 250 }; // far-away customer window
export const CAFE = { x: 4500, base: 780, w: 620 }; // cafe centre x, ground y, width
export const SIDEWALK_Y = 1000; // main street ground
export const MAIN_CAR_Y = 1165; // where car wheels touch the main road
export const SIDE_CAR_Y = 925; // where car wheels touch the side road

// ---- Camera: [centre x, centre y, zoom] ----
type Cam = [number, number, number];
type Way = [number, Cam];

const cr = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

function ride(W: Way[], p: number): Cam {
  const pc = clamp01(p);
  let k = 0;
  while (k < W.length - 2 && pc >= W[k + 1][0]) k++;
  const u = range(pc, W[k][0], W[k + 1][0]);
  const i0 = Math.max(0, k - 1);
  const i3 = Math.min(W.length - 1, k + 2);
  return [0, 1, 2].map((c) => cr(W[i0][1][c], W[k][1][c], W[k + 1][1][c], W[i3][1][c], u)) as Cam;
}

// A smooth line through points (the flying reel).
export function curve2(pts: [number, number][], u: number): [number, number] {
  const n = pts.length - 1;
  const x = clamp01(u) * n;
  const k = Math.min(n - 1, Math.floor(x));
  const f = x - k;
  const a = pts[Math.max(0, k - 1)];
  const b = pts[k];
  const c = pts[k + 1];
  const d = pts[Math.min(n, k + 2)];
  return [cr(a[0], b[0], c[0], d[0], f), cr(a[1], b[1], c[1], d[1], f)];
}

// ---- Car routes: straight roads with rounded corners ----
type CarPath = { total: number; at: (d: number) => { x: number; y: number; angle: number } };

function makeCarPath(pts: [number, number][], r: number): CarPath {
  const s: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]];
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a: [number, number] = [p1[0] + ((p0[0] - p1[0]) / d1) * r, p1[1] + ((p0[1] - p1[1]) / d1) * r];
    const b: [number, number] = [p1[0] + ((p2[0] - p1[0]) / d2) * r, p1[1] + ((p2[1] - p1[1]) / d2) * r];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      s.push([
        (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * p1[0] + t * t * b[0],
        (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * p1[1] + t * t * b[1],
      ]);
    }
  }
  s.push(pts[pts.length - 1]);
  const len: number[] = [0];
  for (let i = 1; i < s.length; i++) len.push(len[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const total = len[len.length - 1];
  return {
    total,
    at(d: number) {
      const dd = Math.min(total, Math.max(0, d));
      let i = 1;
      while (i < s.length - 1 && len[i] < dd) i++;
      const t = (dd - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
      const dx = s[i][0] - s[i - 1][0];
      const dy = s[i][1] - s[i - 1][1];
      return { x: lerp(s[i - 1][0], s[i][0], t), y: lerp(s[i - 1][1], s[i][1], t), angle: Math.atan2(dy, dx) };
    },
  };
}

// Down the main street, then a small curve up to the cafe's side street.
const ROUTE_TAIL: [number, number][] = [
  [2850, MAIN_CAR_Y],
  [3350, SIDE_CAR_Y],
  [4420, SIDE_CAR_Y],
];
const CAR_YOU = makeCarPath([[-500, MAIN_CAR_Y], ...ROUTE_TAIL], 300);
const CAR_INF = makeCarPath([[2250, MAIN_CAR_Y], ...ROUTE_TAIL], 300);
export const ROUTE_POINTS: [number, number][] = [[-500, MAIN_CAR_Y], ...ROUTE_TAIL];

// [appears, starts driving, stops]
const CAR_TIMES: Record<StoryId, [number, number, number]> = {
  you: [0.67, 0.69, 0.91],
  influencer: [0.48, 0.5, 0.66],
  restaurant: [0.49, 0.52, 0.88],
};

export function carState(id: StoryId, p: number) {
  const path = id === "influencer" ? CAR_INF : CAR_YOU;
  const t = CAR_TIMES[id];
  const s = smooth(range(p, t[1], t[2]));
  const st = path.at(s * path.total);
  // The car gets a little smaller as it goes "up" the side street, so it feels farther away.
  const depth = clamp01((MAIN_CAR_Y - st.y) / (MAIN_CAR_Y - SIDE_CAR_Y));
  return {
    x: st.x,
    y: st.y,
    angle: st.angle * 0.7,
    scale: smooth(range(p, t[0], t[0] + 0.02)) * lerp(1, 0.82, depth),
  };
}

// Restaurant story: cars that drive straight past the junction and never stop.
export const PASSER_STARTS = [0.25, 0.31, 0.37];
export function passerAt(k: number, p: number) {
  const u = range(p, PASSER_STARTS[k], PASSER_STARTS[k] + 0.1);
  return { visible: u > 0 && u < 1, x: lerp(1600, 4600, u) };
}

// The reel that flies from window A to window B (influencer story).
const REEL_PTS: [number, number][] = [
  [600, 430],
  [900, 230],
  [1500, 170],
  [2000, 280],
  [2300, 430],
];
export const reelAt = (p: number) => curve2(REEL_PTS, smooth(range(p, 0.13, 0.34)));

// ---- A camera that follows something that moves ----
type Off = [number, number, number, number]; // p, dx, dy, zoom
function follow(pos: (p: number) => [number, number], offs: Off[], step = 0.01): Way[] {
  const out: Way[] = [];
  const p0 = offs[0][0];
  const p1 = offs[offs.length - 1][0];
  for (let p = p0; p <= p1 + 1e-9; p += step) {
    const q = Math.min(p, p1);
    let k = 0;
    while (k < offs.length - 2 && q >= offs[k + 1][0]) k++;
    const u = smooth(range(q, offs[k][0], offs[k + 1][0]));
    const c = pos(q);
    out.push([
      q,
      [
        c[0] + lerp(offs[k][1], offs[k + 1][1], u),
        c[1] + lerp(offs[k][2], offs[k + 1][2], u),
        lerp(offs[k][3], offs[k + 1][3], u),
      ],
    ]);
  }
  return out;
}
const carXY = (id: StoryId) => (p: number): [number, number] => {
  const c = carState(id, p);
  return [c.x, c.y];
};
const reelXY = (p: number): [number, number] => reelAt(p);

const WAYS: Record<StoryId, Way[]> = {
  you: [
    [0.0, [900, 700, 0.95]],
    [0.08, [720, 600, 1.4]],
    [0.14, [570, 470, 3.4]], // up to the window
    [0.2, [550, 440, 6]],
    [0.34, [550, 440, 6.2]], // inside: she scrolls and saves
    [0.4, [580, 560, 1.5]],
    [0.5, [560, 600, 1.15]], // three days and nights
    [0.58, [600, 590, 1.12]],
    [0.65, [560, 600, 1.15]],
    [0.67, [150, 960, 1.6]],
    ...follow(carXY("you"), [
      [0.69, 250, -110, 1.6],
      [0.74, 200, -90, 1.9],
      [0.77, 40, -110, 5.2], // zoom to the driver
      [0.82, 40, -110, 5.2],
      [0.86, 330, -170, 1.4],
      [0.91, 40, -260, 1.2],
      [1.0, 0, -340, 1.15],
    ]),
  ],
  influencer: [
    [0.0, [560, 440, 4.2]],
    [0.1, [550, 440, 6]], // she films the cup
    [0.115, [550, 440, 5.5]],
    ...follow(reelXY, [
      [0.13, 120, 40, 2.6],
      [0.22, 40, 70, 1.6],
      [0.3, 0, 40, 2.4],
    ]),
    [0.34, [2300, 440, 6]], // the far window
    [0.44, [2300, 440, 6.2]],
    [0.48, [2400, 640, 1.3]],
    ...follow(carXY("influencer"), [
      [0.5, 250, -120, 1.6],
      [0.58, 300, -150, 1.4],
      [0.64, 330, -200, 1.2],
      [0.7, 100, -330, 1.15],
    ]),
    [0.78, [4450, 560, 1.5]],
    [0.82, [3800, 380, 0.75]],
    [0.88, [2500, 330, 0.5]],
    [0.94, [800, 420, 1.2]],
    [1.0, [600, 430, 2.4]],
  ],
  restaurant: [
    [0.0, [4480, 640, 1.35]],
    [0.12, [4430, 640, 1.45]],
    [0.2, [4350, 650, 1.3]],
    [0.25, [3000, 900, 0.8]],
    [0.4, [3050, 880, 0.78]],
    [0.46, [1500, 960, 1.2]],
    ...follow(carXY("restaurant"), [
      [0.5, 250, -120, 1.5],
      [0.56, 40, -110, 5.2],
      [0.64, 40, -110, 5.2],
      [0.7, 330, -170, 1.4],
      [0.78, 450, -190, 1.2],
      [0.86, 0, -300, 1.25],
      [0.9, -60, -320, 1.5],
      [1.0, -60, -320, 1.5],
    ]),
  ],
};

export function cameraFor(id: StoryId, p: number): Cam {
  return ride(WAYS[id], p);
}
