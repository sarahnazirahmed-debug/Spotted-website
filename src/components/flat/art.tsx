// Flat illustrated shapes, drawn like the reference picture: soft simple forms, no people.
import { C } from "@/lib/flat";

// ---- The glowing pin: a red location pin with a soft yellow glow. Origin = the tip. About 300 tall. ----
// It is the traveller in every story: it moves along the road and lands at the cafe.
export function ArrivalPin() {
  return (
    <g>
      <circle cx="0" cy="-200" r="300" fill={C.yellow} opacity="0.1" />
      <circle cx="0" cy="-200" r="200" fill={C.yellow} opacity="0.18" />
      <ellipse cx="0" cy="2" rx="60" ry="10" fill={C.deep} opacity="0.3" />
      <path d="M 0 0 C -100 -120 -136 -190 -136 -230 A 136 136 0 0 1 136 -230 C 136 -190 100 -120 0 0 Z" fill={C.red} />
      <path d="M 0 0 C 100 -120 136 -190 136 -230 C 136 -270 110 -330 40 -358 C 100 -300 90 -150 0 0 Z" fill={C.deep} opacity="0.16" />
      <path d="M -70 -262 Q -70 -312 -22 -330" fill="none" stroke={C.lilac} strokeWidth="14" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

// ---- A phone standing on a little stand, filming the table. Origin = the foot of the stand. ----
export function PhoneStand() {
  return (
    <g>
      <rect x="-26" y="-6" width="52" height="8" rx="4" fill={C.lilac} />
      <rect x="-3" y="-30" width="6" height="26" fill={C.lilac} />
      <rect x="-20" y="-104" width="40" height="76" rx="9" fill={C.white} />
      <rect x="-15" y="-98" width="30" height="62" rx="5" fill={C.deep} />
      <rect x="-10" y="-92" width="20" height="5" rx="2.5" fill={C.red} />
    </g>
  );
}

// ---- A friendly open-top car facing right, with no driver. Origin = middle, wheels on the ground. ----
export function CarSide({
  color = C.red,
}: {
  color?: string;
}) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="200" ry="12" fill={C.deep} opacity="0.35" />
      {/* seat back */}
      <rect x="-96" y="-152" width="34" height="70" rx="12" fill={C.lilac} />
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

export function StarShape({ fill = C.green }: { fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? 14 : 34;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} />;
}
