// The banner as a still picture (no movement). Used on slow phones, with Reduce Motion,
// before the 3D banner has loaded, and as the fallback if 3D does not work.
// The numbers match the printed cloth in banner3d.ts (a 1024 x 1584 picture).
import { bannerWords } from "@/config/features";

export default function BannerStill({ className, label: l, line2: d }: { className?: string; label?: string; line2?: string }) {
  const words = bannerWords();
  const label = l ?? words.label;
  const line2 = d ?? words.line2;
  // the highlight bar is about as wide as the last line of words (roughly 58 units per letter)
  const barW = Math.min(800, (line2 ?? label).length * (line2 ? 58 : 64) + 16);
  const font = "var(--font-heading), system-ui, sans-serif";
  return (
    <svg
      viewBox="0 0 1024 1584"
      role="img"
      aria-label={`Spotted banner: ${label}${line2 ? `, ${line2}` : ""}`}
      className={className}
    >
      <defs>
        <linearGradient id="still-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--c-main)" stopOpacity="0.5" />
          <stop offset="0.35" stopColor="var(--c-soft)" stopOpacity="0.38" />
          <stop offset="0.65" stopColor="var(--c-accent)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--c-main)" stopOpacity="0.5" />
        </linearGradient>
        <filter id="still-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <path d="M 0 0 H 1024 V 1584 L 512 1378 L 0 1584 Z" fill="var(--c-accent)" />
      <path d="M 0 0 H 1024 V 1584 L 512 1378 L 0 1584 Z" fill="url(#still-sheen)" />
      <path
        d="M 40 40 H 984 V 1522 L 512 1332 L 40 1522 Z"
        fill="none"
        stroke="var(--c-soft)"
        strokeOpacity="0.6"
        strokeWidth="6"
        strokeDasharray="16 14"
      />
      <path
        d="M 512 640 C 322 440 382 300 512 300 C 642 300 702 440 512 640 Z"
        fill="var(--c-soft)"
        filter="url(#still-glow)"
        opacity="0.8"
      />
      <path d="M 512 640 C 322 440 382 300 512 300 C 642 300 702 440 512 640 Z" fill="var(--c-paper)" />
      <circle cx="512" cy="410" r="46" fill="var(--c-accent)" />
      <text
        x="512"
        y={line2 ? 880 : 940}
        textAnchor="middle"
        fill="var(--c-paper)"
        fontFamily={font}
        fontWeight="800"
        fontSize={line2 ? 78 : 96}
        letterSpacing="8"
      >
        {label}
      </text>
      <rect x={512 - barW / 2} y={line2 ? 1040 : 970} width={barW} height="22" rx="11" fill="var(--c-glow)" />
      {line2 && (
        <text x="512" y="1010" textAnchor="middle" fill="var(--c-paper)" fontFamily={font} fontWeight="800" fontSize="108">
          {line2}
        </text>
      )}
    </svg>
  );
}
