"use client";

// The "Rate us" link in the footer. It ALWAYS opens the card, even when the star is hidden. The card grows out of this link.
import { text } from "@/content";
import { RATE_OPEN_EVENT } from "@/lib/ratingStar";

export default function RateUsLink() {
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent(RATE_OPEN_EVENT, { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
      }}
      className="flex min-h-11 items-center text-left font-bold hover:underline focus-visible:outline-2 focus-visible:outline-coral"
    >
      {text.rate.star}
    </button>
  );
}
