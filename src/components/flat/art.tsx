// Flat illustrated shapes, drawn like the reference picture: soft simple forms, no faces.
import { C } from "@/lib/flat";

// ---- The woman, seen from behind. Origin = middle of her feet. About 540 tall. ----
// pose "stand": standing, back to us (like the picture).
// pose "sit": only her top half (a bed or a table hides the rest).
// pose "film": standing with one arm up, holding a phone.
export function Woman({ pose = "stand" }: { pose?: "stand" | "sit" | "film" }) {
  return (
    <g>
      {pose !== "sit" && (
        <g>
          {/* wide trousers */}
          <path d="M -82 -234 L -6 -234 L -14 -22 L -90 -22 Z" fill={C.deep} />
          <path d="M 6 -234 L 82 -234 L 90 -22 L 14 -22 Z" fill={C.deep} />
          <path d="M -60 -230 L -52 -40 M 56 -230 L 50 -40" stroke={C.lilac} strokeWidth="4" opacity="0.28" />
          {/* trainers */}
          <path d="M -96 -24 L -10 -24 L -4 -6 Q -4 6 -18 6 L -86 6 Q -102 6 -100 -8 Z" fill={C.brand} />
          <path d="M 96 -24 L 10 -24 L 4 -6 Q 4 6 18 6 L 86 6 Q 102 6 100 -8 Z" fill={C.brand} />
          <rect x="-100" y="1" width="94" height="7" rx="3.5" fill={C.white} />
          <rect x="6" y="1" width="94" height="7" rx="3.5" fill={C.white} />
        </g>
      )}
      {/* loose top and sleeves */}
      <path
        d="M -62 -432 C -92 -428 -100 -392 -104 -340 L -112 -250 Q -112 -232 -94 -232 L 94 -232 Q 112 -232 112 -250 L 104 -340 C 100 -392 92 -428 62 -432 C 40 -420 -40 -420 -62 -432 Z"
        fill={C.white}
      />
      <path d="M 40 -420 C 86 -420 98 -380 102 -330 L 110 -250 Q 110 -234 94 -234 L 60 -234 Z" fill={C.deep} opacity="0.1" />
      <path d="M -98 -246 L 98 -246" stroke={C.lilac} strokeWidth="3" opacity="0.5" strokeDasharray="3 6" />
      {/* hands */}
      {pose !== "film" && (
        <>
          <ellipse cx="-102" cy="-212" rx="13" ry="25" fill={C.lilac} />
          <ellipse cx="102" cy="-212" rx="13" ry="25" fill={C.lilac} />
        </>
      )}
      {pose === "film" && (
        <>
          <ellipse cx="-102" cy="-212" rx="13" ry="25" fill={C.lilac} />
          {/* right arm raised, holding a phone out to the right */}
          <path d="M 70 -405 L 175 -350" stroke={C.white} strokeWidth="46" strokeLinecap="round" />
          <circle cx="190" cy="-342" r="19" fill={C.lilac} />
          <rect x="196" y="-402" width="34" height="62" rx="8" fill={C.lilac} stroke={C.white} strokeWidth="5" />
        </>
      )}
      {/* headscarf: head, then the cloth hanging down the back */}
      <path
        d="M -36 -446 C -76 -404 -92 -330 -76 -244 L -54 -236 C -40 -300 -22 -362 32 -440 Z"
        fill={C.lilac}
      />
      <path d="M -36 -446 C -60 -400 -62 -330 -54 -250 L -54 -236 C -40 -300 -22 -362 32 -440 Z" fill={C.deep} opacity="0.16" />
      <ellipse cx="0" cy="-472" rx="45" ry="55" fill={C.lilac} />
      <path d="M -45 -472 C -45 -520 -8 -527 18 -520 C 36 -514 45 -496 45 -472 C 30 -490 -20 -494 -45 -472 Z" fill={C.deep} opacity="0.14" />
    </g>
  );
}

// ---- A driver seen from the side: just the headscarf, no face ----
function Driver() {
  return (
    <g>
      <path d="M -20 0 L -34 -140 Q -34 -170 0 -170 Q 34 -170 36 -140 L 30 0 Z" fill={C.white} />
      <path d="M 24 -120 L 92 -86" stroke={C.white} strokeWidth="34" strokeLinecap="round" />
      <circle cx="104" cy="-80" r="14" fill={C.lilac} />
      <path d="M -40 -212 C -80 -200 -84 -140 -66 -100 L -40 -110 Z" fill={C.lilac} />
      <circle cx="0" cy="-212" r="46" fill={C.lilac} />
      <path d="M -46 -212 C -46 -250 -10 -262 20 -254 C 36 -246 46 -232 46 -212 C 20 -232 -20 -234 -46 -212 Z" fill={C.deep} opacity="0.14" />
    </g>
  );
}

// ---- A friendly open-top car facing right. Origin = middle, wheels on the ground. ----
export function CarSide({
  color = C.red,
  driver = true,
  driverRef,
}: {
  color?: string;
  driver?: boolean;
  driverRef?: React.Ref<SVGGElement>;
}) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="200" ry="12" fill={C.deep} opacity="0.35" />
      {/* seat back behind the driver */}
      <rect x="-96" y="-152" width="34" height="70" rx="12" fill={C.lilac} />
      {driver && (
        <g ref={driverRef} transform="translate(-34,-96) scale(0.44)">
          <Driver />
        </g>
      )}
      {/* body */}
      <path
        d="M -184 -34 L -184 -72 Q -184 -90 -166 -92 L 150 -92 Q 184 -92 186 -66 L 186 -34 Z"
        fill={color}
      />
      <rect x="-184" y="-60" width="370" height="10" fill={C.deep} opacity="0.16" />
      {/* windscreen */}
      <path d="M 30 -92 L 74 -148 L 92 -148 L 100 -92 Z" fill={C.lilac} opacity="0.7" />
      <rect x="66" y="-150" width="30" height="6" rx="3" fill={C.deep} />
      {/* steering wheel */}
      <ellipse cx="22" cy="-112" rx="7" ry="22" fill={C.deep} transform="rotate(-18 22 -112)" />
      {/* light bar and bumpers */}
      <rect x="172" y="-80" width="14" height="22" rx="5" fill={C.yellow} />
      <rect x="-190" y="-76" width="10" height="22" rx="5" fill={C.lilac} />
      <rect x="-180" y="-42" width="372" height="10" rx="5" fill={C.lilac} />
      {/* wheels */}
      {[-112, 112].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-34" r="38" fill={C.deep} />
          <circle cx={x} cy="-34" r="16" fill={C.lilac} />
        </g>
      ))}
    </g>
  );
}

// ---- Small props ----
export function BookmarkShape({ fill = C.red }: { fill?: string }) {
  return <path d="M -30 -48 L 30 -48 L 30 48 L 0 24 L -30 48 Z" fill={fill} strokeLinejoin="round" />;
}

// The logo: a red bookmark with a yellow location pin hanging from its top.
export function Logo() {
  return (
    <g>
      <BookmarkShape />
      <path d="M -30 -48 L 30 -48 L 30 -38 L -30 -38 Z" fill={C.deep} opacity="0.18" />
      <circle cx="0" cy="-60" r="8" fill="none" stroke={C.lilac} strokeWidth="4" />
      <line x1="0" y1="-52" x2="0" y2="-24" stroke={C.lilac} strokeWidth="2.5" />
      <path d="M 0 22 C -16 2 -18 -8 -18 -14 A 18 18 0 0 1 18 -14 C 18 -8 16 2 0 22 Z" fill={C.yellow} />
    </g>
  );
}

export function StarShape({ fill = C.yellow }: { fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? 14 : 34;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
}
