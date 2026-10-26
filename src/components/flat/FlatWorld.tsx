"use client";

// The flat illustrated world. One big SVG drawing of the street; the "camera" is just the
// viewBox gliding and zooming over it as you scroll. Vector shapes stay sharp at any zoom.

import { useEffect, useMemo, useRef } from "react";
import { story, range, smooth, lerp, easeOutBack, dayFactor, type StoryId } from "@/lib/story";
import {
  C,
  WIN_A,
  WIN_B,
  CAFE,
  SIDEWALK_Y,
  MAIN_CAR_Y,
  ROUTE_POINTS,
  cameraFor,
  carState,
  passerAt,
  curve2,
} from "@/lib/flat";
import { Woman, CarSide, BookmarkShape, Logo, StarShape } from "./art";

// ---------------------------------------------------------------- tiny animation engine
type Tick = (p: number, time: number) => void;
const tickers = new Set<Tick>();

function useTick(cb: Tick) {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  useEffect(() => {
    const f: Tick = (p, t) => ref.current(p, t);
    tickers.add(f);
    return () => {
      tickers.delete(f);
    };
  }, []);
}

function place(el: Element | null, x: number, y: number, s = 1, rotDeg = 0) {
  el?.setAttribute("transform", `translate(${x} ${y}) rotate(${rotDeg}) scale(${s})`);
}
function vis(el: Element | null, on: boolean) {
  el?.setAttribute("visibility", on ? "visible" : "hidden");
}
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mixHex(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(x[i], y[i], t))).join(",")})`;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------- the street (drawn once)
type Rect = [number, number, number, number];
function buildCity() {
  const r = rng(21);
  const blocks: { x: number; w: number; top: number }[] = [];
  const fill = (from: number, to: number) => {
    let x = from;
    while (x < to - 160) {
      const w = Math.min(to - x, 220 + r() * 120);
      blocks.push({ x, w, top: 380 + r() * 240 });
      x += w;
    }
  };
  fill(-1400, 400);
  fill(700, 2150);
  fill(2450, 3100);
  const homes = [
    { x: 400, w: 300, top: 250, win: WIN_A },
    { x: 2150, w: 300, top: 260, win: WIN_B },
  ];
  const lit: Rect[] = [];
  const dark: Rect[] = [];
  [...blocks.map((b) => ({ ...b, win: null as null | typeof WIN_A })), ...homes].forEach((b) => {
    const cols = Math.floor(b.w / 72);
    const rows = Math.floor((SIDEWALK_Y - b.top - 90) / 120);
    const left = b.x + (b.w - cols * 72) / 2 + 18;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rect: Rect = [left + col * 72, b.top + 50 + row * 120, 34, 56];
        if (b.win && rect[0] + rect[2] > b.win.x - b.win.w / 2 - 12 && rect[0] < b.win.x + b.win.w / 2 + 12 && rect[1] + rect[3] > b.win.y - b.win.h / 2 - 12 && rect[1] < b.win.y + b.win.h / 2 + 12) continue;
        (r() < 0.5 ? lit : dark).push(rect);
      }
    }
  });
  const toPath = (rs: Rect[]) => rs.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");
  return { blocks, homes, litPath: toPath(lit), darkPath: toPath(dark) };
}

const FAR: Rect[] = [
  [-1400, 520, 300, 480],
  [-1000, 460, 240, 540],
  [-500, 540, 320, 460],
  [100, 500, 260, 500],
  [900, 470, 300, 530],
  [1500, 530, 260, 470],
  [2600, 480, 340, 520],
  [3300, 430, 260, 360],
  [3700, 400, 300, 390],
  [5000, 410, 340, 380],
  [5500, 440, 300, 350],
];

function Street({ id }: { id: StoryId }) {
  const city = useMemo(() => buildCity(), []);
  const litRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGGElement>(null);
  useTick((p) => {
    const d = id === "you" ? dayFactor(id, p) : 0;
    litRef.current?.setAttribute("fill", mixHex(C.yellow, C.brand, d));
    glowRef.current?.setAttribute("opacity", String(1 - d));
  });
  const routePath = ROUTE_POINTS.map(([x, y], k) => `${k ? "L" : "M"}${x} ${y - 45}`).join(" ");
  const lamps = Array.from({ length: 24 }, (_, k) => -1200 + k * 420);
  return (
    <g>
      <defs>
        <radialGradient id="glow">
          <stop offset="0" stopColor={C.yellow} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.yellow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* far skyline */}
      {FAR.map(([x, y, w, h], k) => (
        <rect key={k} x={x} y={y} width={w} height={h} fill={C.brand} opacity="0.5" />
      ))}
      {/* ground behind the side street and the cafe area */}
      <rect x="3000" y="780" width="4200" height="230" fill={C.deep} />
      <rect x="3200" y="780" width="3400" height="26" fill={C.lilac} opacity="0.22" />
      {/* buildings behind the cafe */}
      {[
        [3500, 420, 320, 360],
        [3860, 470, 220, 310],
        [5000, 400, 360, 380],
        [5420, 450, 260, 330],
      ].map(([x, y, w, h], k) => (
        <g key={k}>
          <rect x={x} y={y} width={w} height={h} fill={C.brand} />
          <rect x={x - 8} y={y - 14} width={w + 16} height="16" fill={C.deep} />
        </g>
      ))}
      {/* main road and sidewalk */}
      <rect x="-2000" y="1000" width="9400" height="500" fill={C.deep} />
      <rect x="-2000" y="1042" width="9400" height="150" fill={C.brand} />
      <line x1="-2000" y1="1120" x2="7400" y2="1120" stroke={C.lilac} strokeWidth="6" strokeDasharray="60 50" opacity="0.8" />
      {/* the little side street that curves up to the cafe */}
      <path d={routePath} fill="none" stroke={C.brand} strokeWidth="150" strokeLinejoin="round" />
      {/* buildings */}
      {[...city.blocks, ...city.homes].map((b, k) => (
        <g key={k}>
          <rect x={b.x} y={b.top} width={b.w} height={SIDEWALK_Y - b.top} fill={C.brand} />
          <rect x={b.x - 8} y={b.top - 16} width={b.w + 16} height="18" fill={C.deep} />
          <rect x={b.x} y={b.top + 20} width={b.w} height="4" fill={C.deep} opacity="0.2" />
          <rect x={b.x} y={SIDEWALK_Y - 70} width={b.w} height="70" fill={C.deep} opacity="0.22" />
        </g>
      ))}
      <path d={city.darkPath} fill={C.deep} opacity="0.75" />
      <path ref={litRef} d={city.litPath} fill={C.yellow} />
      {/* street lamps */}
      <g ref={glowRef}>
        {lamps.map((x) => (
          <circle key={x} cx={x} cy={SIDEWALK_Y - 250} r="110" fill="url(#glow)" />
        ))}
      </g>
      {lamps.map((x) => (
        <g key={x}>
          <rect x={x - 5} y={SIDEWALK_Y - 250} width="10" height="250" fill={C.lilac} />
          <circle cx={x} cy={SIDEWALK_Y - 256} r="16" fill={C.yellow} />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- reels (the pictures on phones)
function ReelFace({ kind }: { kind: "cup" | "cake" | "pizza" }) {
  return (
    <g>
      <rect width="70" height="120" rx="8" fill={kind === "cake" ? C.red : C.brand} />
      <rect x="6" y="8" width="26" height="8" rx="4" fill={C.white} opacity="0.9" />
      {kind === "cup" && (
        <g>
          <rect x="19" y="46" width="30" height="28" rx="8" fill={C.yellow} />
          <path d="M 49 52 a 8 9 0 0 1 0 17" fill="none" stroke={C.yellow} strokeWidth="5" />
          <path d="M 26 40 q 4 -8 0 -14 M 36 40 q 4 -8 0 -14" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {kind === "cake" && (
        <g>
          <rect x="14" y="62" width="42" height="18" rx="5" fill={C.lilac} />
          <rect x="19" y="48" width="32" height="14" rx="5" fill={C.yellow} />
          <circle cx="35" cy="42" r="5" fill={C.white} />
        </g>
      )}
      {kind === "pizza" && (
        <g>
          <path d="M 12 48 L 58 48 L 35 86 Z" fill={C.lilac} />
          <circle cx="28" cy="58" r="4" fill={C.red} />
          <circle cx="40" cy="60" r="4" fill={C.red} />
        </g>
      )}
      <rect x="7" y="100" width="42" height="6" rx="3" fill={C.white} opacity="0.9" />
    </g>
  );
}

// ---------------------------------------------------------------- a room behind a window
type RoomKind = "sit" | "film";
function Room({
  win,
  clip,
  kind,
  scrollAt,
  popAt,
}: {
  win: { x: number; y: number; w: number; h: number };
  clip: string;
  kind: RoomKind;
  scrollAt: (p: number) => number;
  popAt: number;
}) {
  const strip = useRef<SVGGElement>(null);
  const pop = useRef<SVGGElement>(null);
  useTick((p) => {
    const k = scrollAt(p);
    strip.current?.setAttribute("transform", `translate(0 ${-(k % 3) * 120})`);
    const a = Math.max(0, easeOutBack(range(p, popAt, popAt + 0.05)));
    place(pop.current, win.w / 2 - 12, -win.h / 2 + 18, a * 0.5);
    vis(pop.current, a > 0.02);
  });
  const hw = win.w / 2;
  const hh = win.h / 2;
  return (
    <g transform={`translate(${win.x} ${win.y})`}>
      <defs>
        <clipPath id={clip}>
          <rect x={-hw} y={-hh} width={win.w} height={win.h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={-hw} y={-hh} width={win.w} height={win.h} fill={C.brand} />
        <rect x={-hw} y="66" width={win.w} height="70" fill={C.deep} />
        <rect x="-100" y="-96" width="40" height="52" rx="4" fill={C.yellow} />
        <rect x="-93" y="-89" width="26" height="38" rx="2" fill={C.deep} opacity="0.3" />
        {kind === "sit" ? (
          <g>
            <g transform="translate(-42 98) scale(0.33)">
              <Woman pose="sit" />
            </g>
            <rect x="-112" y="26" width="146" height="70" rx="10" fill={C.lilac} />
            <rect x="-106" y="10" width="46" height="26" rx="12" fill={C.white} />
            {/* what she sees: a reel feed */}
            <circle cx="22" cy="-38" r="5" fill={C.white} />
            <circle cx="12" cy="-24" r="3" fill={C.white} />
            <rect x="34" y="-102" width="80" height="130" rx="14" fill={C.white} />
            <clipPath id={`${clip}-card`}>
              <rect x="39" y="-97" width="70" height="120" rx="8" />
            </clipPath>
            <g clipPath={`url(#${clip}-card)`}>
              <g transform="translate(39 -97)">
                <g ref={strip}>
                  {(["cup", "cake", "pizza", "cup"] as const).map((kd, i) => (
                    <g key={i} transform={`translate(0 ${i * 120})`}>
                      <ReelFace kind={kd} />
                    </g>
                  ))}
                </g>
              </g>
            </g>
          </g>
        ) : (
          <g>
            <rect x="34" y="52" width="86" height="60" rx="6" fill={C.lilac} />
            <rect x="52" y="30" width="34" height="26" rx="8" fill={C.yellow} />
            <path d="M 86 36 a 6 7 0 0 1 0 13" fill="none" stroke={C.yellow} strokeWidth="4" />
            <path d="M 60 24 q 4 -8 0 -14 M 72 24 q 4 -8 0 -14" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(-44 108) scale(0.29)">
              <Woman pose="film" />
            </g>
          </g>
        )}
      </g>
      {/* frame, sill, and a warm glow */}
      <rect x={-hw} y={-hh} width={win.w} height={win.h} fill={C.yellow} opacity="0.1" />
      <rect x={-hw} y={-hh} width={win.w} height={win.h} fill="none" stroke={C.lilac} strokeWidth="10" />
      <rect x={-hw - 14} y={hh} width={win.w + 28} height="16" rx="5" fill={C.lilac} />
      {/* bookmark that pops up when she saves */}
      <g ref={pop} visibility="hidden">
        <BookmarkShape />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- the cafe
function Cafe({ id }: { id: StoryId }) {
  const wins = useRef<(SVGRectElement | null)[]>([]);
  useTick((p) => {
    wins.current.forEach((w, k) => {
      const lit = id === "you" ? range(p, 0.89 + k * 0.01, 0.93) : id === "influencer" ? 1 : range(p, 0.86 + k * 0.01, 0.9);
      w?.setAttribute("fill", mixHex(C.deep, C.yellow, lit));
    });
  });
  return (
    <g transform={`translate(${CAFE.x} ${CAFE.base})`}>
      <ellipse cx="0" cy="6" rx="380" ry="16" fill={C.deep} opacity="0.4" />
      <rect x="-310" y="-400" width="620" height="400" fill={C.lilac} />
      <rect x="-332" y="-432" width="664" height="38" rx="6" fill={C.red} />
      <rect x="-150" y="-366" width="300" height="76" rx="16" fill={C.deep} stroke={C.yellow} strokeWidth="6" />
      <text
        x="0"
        y="-314"
        textAnchor="middle"
        fontSize="42"
        fontWeight="800"
        fill={C.white}
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
      >
        Café Luna
      </text>
      {/* door and striped awning */}
      <rect x="-270" y="-200" width="90" height="200" rx="6" fill={C.deep} />
      <circle cx="-196" cy="-100" r="6" fill={C.yellow} />
      {Array.from({ length: 6 }, (_, k) => (
        <rect key={k} x={-286 + k * 20} y="-226" width="20" height="30" fill={k % 2 ? C.white : C.red} />
      ))}
      {/* three windows */}
      {[-130, 0, 130].map((x, k) => (
        <g key={x}>
          <rect x={x - 6} y="-246" width="112" height="152" rx="6" fill={C.deep} />
          <rect
            ref={(el) => {
              wins.current[k] = el;
            }}
            x={x}
            y="-240"
            width="100"
            height="140"
            rx="4"
            fill={C.deep}
          />
        </g>
      ))}
      <ellipse cx="262" cy="-14" rx="22" ry="14" fill={C.brand} />
      <ellipse cx="262" cy="-38" rx="26" ry="26" fill={C.lilac} stroke={C.brand} strokeWidth="6" />
    </g>
  );
}

function Patio() {
  return (
    <g>
      {[4420, 4600, 4780].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={758} width="8" height="46" fill={C.deep} />
          <ellipse cx={x} cy={756} rx="42" ry="9" fill={C.lilac} />
          <rect x={x - 76} y={768} width="22" height="30" rx="6" fill={C.yellow} />
          <rect x={x + 54} y={768} width="22" height="30" rx="6" fill={C.yellow} />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- cars
function DrivingCar({ id }: { id: StoryId }) {
  const g = useRef<SVGGElement>(null);
  const driver = useRef<SVGGElement>(null);
  useTick((p) => {
    const c = carState(id, p);
    vis(g.current, c.scale > 0.02);
    place(g.current, c.x, c.y, c.scale, (c.angle * 180) / Math.PI);
    // the driver steps out at the end (You and Restaurant stories)
    const out = id === "influencer" ? false : p > (id === "you" ? 0.915 : 0.885);
    vis(driver.current, !out);
  });
  return (
    <g ref={g} visibility="hidden">
      <CarSide driverRef={driver} />
    </g>
  );
}

const PASSER_COLORS = [C.lilac, C.yellow, C.white];
function Passers() {
  const refs = useRef<(SVGGElement | null)[]>([]);
  useTick((p) => {
    refs.current.forEach((g, k) => {
      const st = passerAt(k, p);
      vis(g, st.visible);
      if (st.visible) place(g, st.x, MAIN_CAR_Y, 1);
    });
  });
  return (
    <>
      {PASSER_COLORS.map((c, k) => (
        <g
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          visibility="hidden"
        >
          <CarSide color={c} />
        </g>
      ))}
    </>
  );
}

// She steps out of the car and walks to the cafe door (You and Restaurant stories).
function Arrival({ id }: { id: StoryId }) {
  const g = useRef<SVGGElement>(null);
  useTick((p) => {
    const a = id === "you" ? range(p, 0.915, 0.95) : id === "restaurant" ? range(p, 0.885, 0.93) : 0;
    vis(g.current, a > 0.01);
    place(g.current, lerp(4400, 4300, smooth(a)), lerp(900, 812, smooth(a)), lerp(0.2, 0.4, smooth(a)));
  });
  return (
    <g ref={g} visibility="hidden">
      <Woman pose="stand" />
    </g>
  );
}

// ---------------------------------------------------------------- logo, badges and other story props
function HeroLogo() {
  const g = useRef<SVGGElement>(null);
  useTick((p, t) => {
    const u = smooth(range(p, 0.04, 0.17));
    const [x, y] = curve2(
      [
        [900, 800],
        [800, 640],
        [700, 440],
        [WIN_A.x + WIN_A.w / 2 - 12, WIN_A.y - WIN_A.h / 2 + 18],
      ],
      u,
    );
    const env = 1 - smooth(range(p, 0.37, 0.4));
    vis(g.current, env > 0.01);
    // after she saves it, the logo is the bookmark that pops on her phone
    const pulse = 1 + 0.25 * Math.sin(Math.PI * range(p, 0.29, 0.34));
    place(g.current, x, y + Math.sin(t * 1.6) * 8 * (1 - u), lerp(2.2, 0.55, u) * env * pulse);
  });
  return (
    <g ref={g}>
      <Logo />
    </g>
  );
}

function DayBadges() {
  const refs = useRef<(SVGGElement | null)[]>([]);
  useTick((p) => {
    refs.current.forEach((g, k) => {
      const a = Math.max(0, easeOutBack(range(p, 0.43 + k * 0.09, 0.47 + k * 0.09)));
      vis(g, a > 0.02);
      place(g, WIN_A.x - 90 + k * 90, WIN_A.y - WIN_A.h / 2 - 70, a * 0.7);
    });
  });
  return (
    <>
      {[0, 1, 2].map((k) => (
        <g
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          visibility="hidden"
        >
          <BookmarkShape />
        </g>
      ))}
    </>
  );
}

function PlaceMarker() {
  const g = useRef<SVGGElement>(null);
  useTick((p, t) => {
    const e = smooth(range(p, 0.72, 0.78));
    vis(g.current, e > 0.01);
    place(g.current, CAFE.x, CAFE.base - 520 + Math.sin(t * 1.8) * 8, e * 1.1);
  });
  return (
    <g ref={g} visibility="hidden">
      <BookmarkShape />
    </g>
  );
}

// ---- Influencer ----
function FlyingReel() {
  const g = useRef<SVGGElement>(null);
  useTick((p) => {
    const env = smooth(range(p, 0.12, 0.15)) * (1 - smooth(range(p, 0.335, 0.36)));
    vis(g.current, env > 0.01);
    const u = smooth(range(p, 0.13, 0.34));
    const [x, y] = curve2(
      [
        [WIN_A.x + 50, WIN_A.y],
        [900, 230],
        [1500, 170],
        [2000, 280],
        [WIN_B.x, WIN_B.y],
      ],
      u,
    );
    place(g.current, x, y, env * 1.3, Math.sin(u * 9) * 8);
  });
  return (
    <g ref={g} visibility="hidden">
      <g transform="translate(-35 -60)">
        <rect x="-6" y="-6" width="82" height="132" rx="12" fill={C.lilac} />
        <ReelFace kind="cup" />
      </g>
    </g>
  );
}

function QuestionBubble() {
  const g = useRef<SVGGElement>(null);
  useTick((p, t) => {
    const env = smooth(range(p, 0.66, 0.69)) * (1 - smooth(range(p, 0.78, 0.82)));
    vis(g.current, env > 0.01);
    place(g.current, CAFE.x, CAFE.base - 540 + Math.sin(t * 2) * 6, env * 1.2);
  });
  return (
    <g ref={g} visibility="hidden">
      <path d="M -60 -50 Q -60 -78 -32 -78 L 32 -78 Q 60 -78 60 -50 L 60 12 Q 60 40 32 40 L 12 40 L 0 62 L -12 40 L -32 40 Q -60 40 -60 12 Z" fill={C.lilac} />
      <text x="0" y="14" textAnchor="middle" fontSize="80" fontWeight="800" fill={C.deep} style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
        ?
      </text>
    </g>
  );
}

// A yellow thread grows from the cafe back to the influencer, with a coin riding along it.
const THREAD = `M ${CAFE.x} ${CAFE.base - 380} C 3800 -200 1500 -260 ${WIN_A.x + 60} ${WIN_A.y - WIN_A.h / 2 - 20}`;
function CreditThread() {
  const path = useRef<SVGPathElement>(null);
  const coin = useRef<SVGGElement>(null);
  const star = useRef<SVGGElement>(null);
  useTick((p, t) => {
    const q = smooth(range(p, 0.79, 0.9));
    path.current?.setAttribute("stroke-dashoffset", String(1 - q));
    vis(path.current, q > 0.005);
    const el = path.current;
    if (el && coin.current) {
      const len = el.getTotalLength();
      const pt = el.getPointAtLength(q * len);
      place(coin.current, pt.x, pt.y, 1 + Math.sin(t * 6) * 0.08);
      vis(coin.current, q > 0.01 && q < 0.995);
    }
    const a = Math.max(0, easeOutBack(range(p, 0.9, 0.94)));
    place(star.current, WIN_A.x + 60, WIN_A.y - WIN_A.h / 2 - 90, a * 2.2, t * 40);
    vis(star.current, a > 0.02);
  });
  return (
    <g>
      <path
        ref={path}
        d={THREAD}
        pathLength={1}
        fill="none"
        stroke={C.yellow}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="1 1"
        strokeDashoffset="1"
        visibility="hidden"
      />
      <g ref={coin} visibility="hidden">
        <circle r="46" fill={C.yellow} opacity="0.25" />
        <circle r="26" fill={C.yellow} />
        <circle r="16" fill="none" stroke={C.deep} strokeWidth="4" opacity="0.5" />
      </g>
      <g ref={star} visibility="hidden">
        <StarShape />
      </g>
    </g>
  );
}

// ---- Restaurant ----
function Flyers() {
  const refs = useRef<(SVGRectElement | null)[]>([]);
  const items = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 18 }, () => ({
      x: 3900 + r() * 1100,
      y: 815 + r() * 160,
      delay: r() * 0.08,
      sway: r() * 6,
      rot: r() * 80 - 40,
    }));
  }, []);
  useTick((p) => {
    refs.current.forEach((el, k) => {
      const it = items[k];
      const a = range(p, it.delay, it.delay + 0.12);
      vis(el, a > 0);
      place(el, it.x + (1 - a) * Math.sin(a * 8 + it.sway) * 80, lerp(-100, it.y, smooth(a)), 1, it.rot + (1 - a) * 200);
    });
  });
  return (
    <>
      {items.map((_, k) => (
        <rect
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          x="-12"
          y="-17"
          width="24"
          height="34"
          rx="2"
          fill={k % 2 ? C.yellow : C.white}
          visibility="hidden"
        />
      ))}
    </>
  );
}

function Billboard() {
  return (
    <g transform="translate(3880 806)">
      <rect x="-90" y="-250" width="10" height="250" fill={C.deep} />
      <rect x="80" y="-250" width="10" height="250" fill={C.deep} />
      <rect x="-130" y="-370" width="260" height="170" rx="8" fill={C.yellow} />
      <rect x="-130" y="-240" width="260" height="40" fill={C.red} />
      <text x="0" y="-285" textAnchor="middle" fontSize="70" fontWeight="800" fill={C.deep} style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
        SALE
      </text>
      <text x="0" y="-212" textAnchor="middle" fontSize="26" fontWeight="800" fill={C.white} style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
        50% OFF TODAY
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- scroll speeds of the reel feeds
const scrollYou = (p: number) => 12 * range(p, 0.15, 0.3) + 18 * range(p, 0.4, 0.66);
const scrollB = (p: number) => 9 * range(p, 0.3, 0.4);
const noScroll = () => 0;

// ---------------------------------------------------------------- the whole scene
export default function FlatWorld({ id, onSlow }: { id: StoryId; onSlow: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const sunRef = useRef<SVGCircleElement>(null);
  const moonRef = useRef<SVGCircleElement>(null);
  const starsRef = useRef<SVGGElement>(null);
  const stars = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 70 }, () => ({ x: r() * 160, y: r() * 60, s: 0.3 + r() * 0.5 }));
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let slowRuns = 0;
    const loop = (now: number) => {
      const p = story.p;
      const dt = now - last;
      last = now;
      const el = svg.current;
      if (el) {
        const asp = el.clientWidth / Math.max(1, el.clientHeight);
        const [cx, cy, zoom] = cameraFor(id, p);
        // On tall phone screens, close-ups zoom out a little so the whole scene still fits.
        const z = asp < 1 && zoom > 2.5 ? zoom * 0.62 : zoom;
        const vw = (asp >= 1 ? 1600 : 900) / z;
        const vh = vw / asp;
        el.setAttribute("viewBox", `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`);
      }
      // sky colour, stars, sun and moon
      const d = dayFactor(id, p);
      if (wrap.current) wrap.current.style.backgroundColor = mixHex(C.deep, C.lilac, d);
      starsRef.current?.setAttribute("opacity", String(0.9 * (1 - d)));
      const active = id === "you" && p > 0.4 && p < 0.66;
      const f = (range(p, 0.4, 0.66) * 3) % 1;
      const m = (f + 0.5) % 1;
      sunRef.current?.setAttribute("visibility", active ? "visible" : "hidden");
      moonRef.current?.setAttribute("visibility", active ? "visible" : "hidden");
      sunRef.current?.setAttribute("cx", String(lerp(10, 150, f)));
      sunRef.current?.setAttribute("cy", String(52 - 40 * Math.sin(Math.PI * f)));
      moonRef.current?.setAttribute("cx", String(lerp(10, 150, m)));
      moonRef.current?.setAttribute("cy", String(52 - 40 * Math.sin(Math.PI * m)));
      tickers.forEach((fn) => fn(p, now / 1000));
      // if the screen is slow for a while, hand over to the simple version
      frames++;
      acc += dt;
      if (acc >= 2000) {
        const fps = (frames * 1000) / acc;
        acc = 0;
        frames = 0;
        slowRuns = fps < 20 ? slowRuns + 1 : 0;
        if (slowRuns >= 2) onSlow();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, onSlow]);

  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: C.deep }}>
      {/* sky: stars, sun and moon (they stay on screen, behind the city) */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <g ref={starsRef}>
          {stars.map((s, k) => (
            <circle key={k} cx={s.x} cy={s.y} r={s.s} fill={C.white} />
          ))}
        </g>
        <circle ref={sunRef} r="9" fill={C.yellow} visibility="hidden" />
        <circle ref={moonRef} r="6.5" fill={C.white} visibility="hidden" />
      </svg>

      <svg ref={svg} className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <Street id={id} />
        <Cafe id={id} />
        <Patio />
        <Room
          win={WIN_A}
          clip="roomA"
          kind={id === "influencer" ? "film" : "sit"}
          scrollAt={id === "you" ? scrollYou : noScroll}
          popAt={id === "you" ? 9 : 9}
        />
        {id === "influencer" && <Room win={WIN_B} clip="roomB" kind="sit" scrollAt={scrollB} popAt={0.42} />}

        {id === "you" && (
          <>
            <HeroLogo />
            <DayBadges />
            <PlaceMarker />
            <DrivingCar id="you" />
            <Arrival id="you" />
          </>
        )}
        {id === "influencer" && (
          <>
            <FlyingReel />
            <DrivingCar id="influencer" />
            <QuestionBubble />
            <CreditThread />
          </>
        )}
        {id === "restaurant" && (
          <>
            <Billboard />
            <Flyers />
            <Passers />
            <DrivingCar id="restaurant" />
            <Arrival id="restaurant" />
          </>
        )}
      </svg>
    </div>
  );
}
