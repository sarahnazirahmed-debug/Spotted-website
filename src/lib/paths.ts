// Camera rides and car routes. Everything is a smooth curve so nothing ever jumps.
import { clamp01, range, smooth, lerp, type V3, type StoryId } from "./story";

// ---- Building positions (shared with the 3D world) ----
// Customer / influencer window: left side of the street, high floor.
export const WINDOW_A: V3 = [-5.5, 9, -8];
// Second window (a customer far down the street): right side.
export const WINDOW_B: V3 = [5.5, 9, -48.4];
// Cafe on the side street (right of the main street).
export const CAFE_POS: V3 = [19, 0, -12.4];
export const CAFE_SIGN: V3 = [19.2, 3.5, -14.9];

// ---- Smooth camera path (Catmull-Rom curve through waypoints) ----
type Way = [number, V3, V3]; // scroll position, camera position, look-at point

const cr = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

function ride(WAY: Way[], p: number) {
  const pc = clamp01(p);
  let k = 0;
  while (k < WAY.length - 2 && pc >= WAY[k + 1][0]) k++;
  const u = range(pc, WAY[k][0], WAY[k + 1][0]);
  const i0 = Math.max(0, k - 1);
  const i3 = Math.min(WAY.length - 1, k + 2);
  const at = (sel: 1 | 2): V3 =>
    [0, 1, 2].map((c) => cr(WAY[i0][sel][c], WAY[k][sel][c], WAY[k + 1][sel][c], WAY[i3][sel][c], u)) as V3;
  return { pos: at(1), look: at(2) };
}

// A smooth line through 3D points (used for the flying reel and the credit thread).
export function curve3(pts: V3[], u: number): V3 {
  const n = pts.length - 1;
  const x = clamp01(u) * n;
  const k = Math.min(n - 1, Math.floor(x));
  const f = x - k;
  const a = pts[Math.max(0, k - 1)];
  const b = pts[k];
  const c = pts[k + 1];
  const d = pts[Math.min(n, k + 2)];
  return [0, 1, 2].map((i) => cr(a[i], b[i], c[i], d[i], f)) as V3;
}

// ---- Car routes: straight roads with rounded corners ----
export type CarPath = { total: number; at: (d: number) => { x: number; z: number; yaw: number } };

export function makeCarPath(pts: [number, number][], r: number): CarPath {
  const s: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]];
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a: [number, number] = [p1[0] + ((p0[0] - p1[0]) / d1) * r, p1[1] + ((p0[1] - p1[1]) / d1) * r];
    const b: [number, number] = [p1[0] + ((p2[0] - p1[0]) / d2) * r, p1[1] + ((p2[1] - p1[1]) / d2) * r];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
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
      const dz = s[i][1] - s[i - 1][1];
      return { x: lerp(s[i - 1][0], s[i][0], t), z: lerp(s[i - 1][1], s[i][1], t), yaw: Math.atan2(-dx, -dz) };
    },
  };
}

// "You": the car drives down the main street and turns RIGHT to the cafe.
const CAR_YOU = makeCarPath([[2, 14], [2, -17.9], [19.5, -17.9]], 3.2);
// Influencer: the customer drives from the far window and turns LEFT to the cafe.
const CAR_INF = makeCarPath([[-2, -47], [-2, -17.9], [19.5, -17.9]], 3.5);

const CAR_TIMES: Partial<Record<StoryId, [number, number, number]>> = {
  you: [0.67, 0.69, 0.91], // appears at, starts driving, stops
  influencer: [0.48, 0.5, 0.66],
};

export function carState(id: StoryId, p: number) {
  const path = id === "you" ? CAR_YOU : id === "influencer" ? CAR_INF : null;
  const t = CAR_TIMES[id];
  if (!path || !t) return null;
  const s = smooth(range(p, t[1], t[2]));
  const st = path.at(s * path.total);
  return { ...st, scale: smooth(range(p, t[0], t[0] + 0.02)) };
}

// ---- The reel that flies from window A to window B (influencer story) ----
const REEL_PTS: V3[] = [
  [-5.8, 9, -8],
  [-1, 11.5, -10],
  [1.5, 11.5, -25],
  [3, 10.5, -38],
  [5, 9.3, -47],
  [8.5, 9, -48.4],
  [9.7, 9, -48.4],
];
export const reelAt = (p: number): V3 => curve3(REEL_PTS, smooth(range(p, 0.13, 0.34)));

// ---- The credit thread from the cafe to the influencer's window ----
export const CREDIT_PTS: V3[] = [
  [19.2, 5.2, -14.9],
  [14, 13, -14],
  [4, 17, -10],
  [-4, 14, -8.5],
  [-5.6, 9.6, -8],
];

// ---- Helper: camera that follows something that moves ----
type Off = [number, V3, V3]; // scroll position, camera offset, look offset
function follow(pos: (p: number) => V3, offs: Off[], step = 0.01): Way[] {
  const out: Way[] = [];
  const p0 = offs[0][0];
  const p1 = offs[offs.length - 1][0];
  for (let p = p0; p <= p1 + 1e-9; p += step) {
    const q = Math.min(p, p1);
    let k = 0;
    while (k < offs.length - 2 && q >= offs[k + 1][0]) k++;
    const u = smooth(range(q, offs[k][0], offs[k + 1][0]));
    const c = pos(q);
    const mix = (a: V3, b: V3): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    const co = mix(offs[k][1], offs[k + 1][1]);
    const lo = mix(offs[k][2], offs[k + 1][2]);
    out.push([q, [c[0] + co[0], c[1] + co[1], c[2] + co[2]], [c[0] + lo[0], c[1] + lo[1], c[2] + lo[2]]]);
  }
  return out;
}

const carPos = (id: StoryId) => (p: number): V3 => {
  const c = carState(id, p)!;
  return [c.x, 0, c.z];
};

// ---- One continuous ride for each story ----
const WAYS: Record<StoryId, Way[]> = {
  you: [
    [0.0, [0, 2.2, 5], [0, 1.9, -4]],
    [0.05, [0.8, 2.8, 1.5], [-1, 3.2, -5]],
    [0.1, [1.5, 5.5, -1], [-5.5, 8.5, -8]], // rising up the building
    [0.15, [-1, 8.8, -5.5], [-8, 9, -8]], // at the window
    [0.19, [-5.2, 9.4, -7.6], [-10, 9.1, -8.5]], // through the window
    [0.23, [-6.6, 10.1, -9.4], [-10, 9.1, -8]], // over the shoulder
    [0.32, [-6.4, 10.0, -9.6], [-10, 9.1, -8]],
    [0.37, [-4, 9.4, -7.5], [-9, 9.1, -8]], // zooming back out
    [0.41, [3.6, 8.2, -4], [-5.5, 8.9, -8]], // street view of the window
    [0.5, [4.3, 8.4, -6.5], [-5.5, 8.9, -8]], // three days and nights
    [0.58, [3.8, 8.1, -9.5], [-5.5, 8.9, -8]],
    [0.65, [4.2, 8.3, -6.5], [-5.5, 8.9, -8]],
    [0.67, [1.5, 3.2, 18], [2, 1, 5]], // swing down to the street
    ...follow(carPos("you"), [
      [0.68, [-1.5, 2.4, 8], [0, 0.8, -2]],
      [0.74, [-2.2, 2.2, 6.5], [0, 0.9, -1.5]],
      [0.77, [3.4, 1.6, 2.4], [-0.4, 1.0, 0]], // zoom to the driver
      [0.81, [2.6, 1.7, 1.5], [-0.45, 1.1, -0.1]],
      [0.86, [-3.8, 3.0, 5.0], [0, 0.8, -0.5]],
      [0.91, [-4, 5, -9], [0, 1, 0]],
      [1.0, [-4, 5, -9], [0, 1, 0]],
    ]),
  ],
  influencer: [
    [0.0, [3.6, 9.4, -5.4], [-5.5, 9, -8]],
    [0.08, [0.6, 9.1, -7.6], [-6.5, 8.9, -8]],
    [0.115, [0.2, 9.1, -7.8], [-6.5, 8.9, -8]],
    ...follow(
      (p) => reelAt(p),
      [
        [0.13, [2.8, 1.6, 5.5], [0, 0, 0]],
        [0.22, [1.5, 1.8, 6], [0, 0, 0]],
        [0.28, [-1.5, 1.2, 4.2], [0, 0, 0]],
      ],
    ),
    [0.31, [4, 9.3, -46.5], [7, 9, -48.4]],
    [0.34, [6.3, 9.4, -47.9], [10, 8.9, -48.4]],
    [0.4, [7.4, 9.5, -47.9], [10, 8.9, -48.4]],
    [0.44, [7.6, 9.6, -48], [10, 8.9, -48.4]],
    [0.46, [3, 9, -44], [8, 9, -48]],
    [0.48, [-1, 4.5, -47.5], [0, 1, -47]],
    ...follow(carPos("influencer"), [
      [0.51, [2.5, 2.8, -7.5], [0, 0.8, 2]],
      [0.58, [3, 3.5, -7], [0, 0.8, 1]],
      [0.62, [-7, 3.2, -0.3], [0, 0.8, 0]],
      [0.66, [-6, 3.2, -0.3], [0, 0.8, 0]],
      [0.7, [-2.5, 4.5, -6], [0, 1, 0]],
    ]),
    [0.78, [17, 5.2, -24], [19.2, 4.8, -14]],
    [0.81, [15, 8, -6], [13, 6.5, -14]],
    [0.85, [6, 14, 15], [7, 7.5, -11]],
    [0.9, [1.5, 12, 7], [-3, 9, -8]],
    [0.94, [1.5, 9.8, -2], [-5.5, 9.4, -8]],
    [1.0, [1.5, 9.8, -2], [-5.5, 9.4, -8]],
  ],
  restaurant: [
    [0.0, [16, 5.5, -25], [19.2, 3.5, -13]],
    [0.2, [14.8, 7, -24.5], [19.2, 3.8, -13]],
    [0.4, [17.5, 8, -25.5], [19.2, 3.8, -13]],
    [0.6, [16, 5.2, -24.5], [19.2, 3.5, -13]],
    [0.8, [17, 6.5, -25], [19.2, 3.5, -13]],
    [1.0, [17, 6.5, -25], [19.2, 3.5, -13]],
  ],
};

export function cameraFor(id: StoryId, p: number) {
  return ride(WAYS[id], p);
}
