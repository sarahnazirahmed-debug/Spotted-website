// A face for the Rate us card: a round outline and ONLY A MOUTH. There are no eyes, no nose and no other round shapes.
// 1 is the unhappiest and 5 the happiest. The mouths are in src/lib/ratingStar.ts.
import { MOUTHS, type Rating } from "@/lib/ratingStar";

export default function RateFace({ level, size = 40, className = "" }: { level: Rating; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d={MOUTHS[level]} />
    </svg>
  );
}
