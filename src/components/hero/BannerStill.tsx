// The banner as a still picture (no movement). Used on slow phones, with Reduce Motion,
// before the 3D banner has loaded, and as the fallback if 3D does not work.
// The numbers match the printed cloth in banner3d.ts (a 1024 x 1584 picture).
import { bannerWords } from "@/config/features";

export default function BannerStill({ className, label: l, date: d }: { className?: string; label?: string; date?: string }) {
  const words = bannerWords();
  const label = l ?? words.label;
  const date = d ?? words.date;
  // the highlight bar is about as wide as the second line (roughly 58 units per letter)
  const barW = Math.min(800, date.length * 58 + 16);
  const font = "var(--font-poppins), system-ui, sans-serif";
  return (
    <svg
      viewBox="0 0 1024 1584"
      role="img"
      aria-label={`Spotted banner: ${label}, ${date}`}
      className={className}
    >
      <defs>
        <linearGradient id="still-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6A1FB0" stopOpacity="0.5" />
          <stop offset="0.35" stopColor="#C9A2FF" stopOpacity="0.38" />
          <stop offset="0.65" stopColor="#E5383B" stopOpacity="0.12" />
          <stop offset="1" stopColor="#6A1FB0" stopOpacity="0.5" />
        </linearGradient>
        <filter id="still-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <path d="M 0 0 H 1024 V 1584 L 512 1378 L 0 1584 Z" fill="#E5383B" />
      <path d="M 0 0 H 1024 V 1584 L 512 1378 L 0 1584 Z" fill="url(#still-sheen)" />
      <path
        d="M 40 40 H 984 V 1522 L 512 1332 L 40 1522 Z"
        fill="none"
        stroke="#C9A2FF"
        strokeOpacity="0.6"
        strokeWidth="6"
        strokeDasharray="16 14"
      />
      <path
        d="M 512 640 C 322 440 382 300 512 300 C 642 300 702 440 512 640 Z"
        fill="#C9A2FF"
        filter="url(#still-glow)"
        opacity="0.8"
      />
      <path d="M 512 640 C 322 440 382 300 512 300 C 642 300 702 440 512 640 Z" fill="#FFFFFF" />
      <circle cx="512" cy="410" r="46" fill="#E5383B" />
      <text
        x="512"
        y="880"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily={font}
        fontWeight="800"
        fontSize="78"
        letterSpacing="8"
      >
        {label}
      </text>
      <rect x={512 - barW / 2} y="1040" width={barW} height="22" rx="11" fill="#FFD23F" />
      <text x="512" y="1010" textAnchor="middle" fill="#FFFFFF" fontFamily={font} fontWeight="800" fontSize="108">
        {date}
      </text>
    </svg>
  );
}
