// A drawn stand-in for a dish or item photo (objects only, brand colours).
// Used until real photos and 5-10 second videos arrive. `live` adds a gentle "video" movement
// (steam and a slow zoom); the movement is switched off by Reduce Motion in globals.css.
import type { ArtKind } from "./data";

const W = "#FFFFFF";
const L = "#C9A2FF";
const R = "#E5383B";
const Y = "#FFD23F";

function Steam({ x }: { x: number }) {
  return (
    <path
      d={`M ${x} 82 q 8 -12 0 -24 q -8 -12 0 -24`}
      fill="none"
      stroke={W}
      strokeWidth="5"
      strokeLinecap="round"
      className="dish-steam"
      style={{ "--d": `${(x % 7) * 0.2}s` } as React.CSSProperties}
    />
  );
}

export default function DishArt({
  art,
  palette,
  live = false,
  zoom = 1,
  className,
}: {
  art: ArtKind;
  palette: [string, string];
  live?: boolean;
  zoom?: number;
  className?: string;
}) {
  const gid = `dish-${palette[0].slice(1)}-${palette[1].slice(1)}`;
  return (
    <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette[0]} />
          <stop offset="1" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="220" fill={`url(#${gid})`} />
      <circle cx="240" cy="40" r="90" fill={L} opacity="0.18" />
      <g transform={`translate(150 120) scale(${zoom}) translate(-150 -120)`}>
        <g className={live ? "dish-pan" : undefined}>
          {art === "bowl" && (
            <g>
              {live && (
                <>
                  <Steam x={120} />
                  <Steam x={150} />
                  <Steam x={180} />
                </>
              )}
              <path d="M58 118 H242 C242 168 204 192 150 192 C96 192 58 168 58 118 Z" fill={W} />
              <ellipse cx="150" cy="118" rx="92" ry="15" fill={L} />
              <ellipse cx="150" cy="112" rx="72" ry="12" fill={Y} />
              <rect x="108" y="104" width="12" height="7" rx="3" fill={R} />
              <rect x="146" y="100" width="12" height="7" rx="3" fill={R} />
              <rect x="180" y="106" width="12" height="7" rx="3" fill={R} />
            </g>
          )}
          {art === "cup" && (
            <g>
              {live && (
                <>
                  <Steam x={130} />
                  <Steam x={165} />
                </>
              )}
              <ellipse cx="150" cy="182" rx="84" ry="11" fill={L} />
              <rect x="94" y="94" width="112" height="84" rx="22" fill={W} />
              <path d="M206 112 q 38 0 38 24 q 0 24 -38 24" fill="none" stroke={W} strokeWidth="12" />
              <rect x="104" y="100" width="92" height="14" rx="7" fill={Y} />
            </g>
          )}
          {art === "cake" && (
            <g>
              <rect x="64" y="150" width="172" height="34" rx="10" fill={W} />
              <rect x="64" y="118" width="172" height="34" rx="10" fill={R} />
              <rect x="64" y="96" width="172" height="26" rx="10" fill={W} />
              <circle cx="150" cy="82" r="12" fill={R} />
              <path d="M150 70 q 4 -14 16 -16" fill="none" stroke={L} strokeWidth="5" strokeLinecap="round" />
            </g>
          )}
          {art === "shirt" && (
            <g>
              <path d="M104 64 L150 78 L196 64 L244 98 L214 128 L196 114 L196 184 H104 V114 L86 128 L56 98 Z" fill={W} />
              <path d="M126 70 Q150 98 174 70 L150 78 Z" fill={L} />
              <rect x="104" y="170" width="92" height="8" fill={Y} opacity="0.9" />
            </g>
          )}
          {art === "gift" && (
            <g>
              <rect x="86" y="104" width="128" height="82" rx="8" fill={W} />
              <rect x="76" y="82" width="148" height="28" rx="8" fill={L} />
              <rect x="142" y="82" width="16" height="104" fill={R} />
              <path d="M150 82 C120 46 96 62 120 80 Z M150 82 C180 46 204 62 180 80 Z" fill={R} />
            </g>
          )}
          {art === "bag" && (
            <g>
              <path d="M92 96 H208 L220 186 H80 Z" fill={W} />
              <path d="M122 96 V80 a28 28 0 0 1 56 0 V96" fill="none" stroke={L} strokeWidth="9" strokeLinecap="round" />
              <rect x="124" y="130" width="52" height="14" rx="7" fill={R} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
