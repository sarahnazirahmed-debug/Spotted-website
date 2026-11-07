"use client";

// Shown straight after a reel link is pasted, when that reel is already on the desk. A duplicate cannot be saved.
import type { Reel } from "@/lib/reelTypes";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function DuplicateNotice({ reel, businessName, onOpen, onDifferent }: {
  reel: Reel;
  businessName: string | null;
  onOpen: () => void;
  onDifferent: () => void;
}) {
  return (
    <div role="alert" className="grid gap-3 rounded-2xl border-2 border-line bg-alt p-4">
      <p className="text-xl font-extrabold text-heading">This reel already exists.</p>
      <dl className="grid gap-1 text-base">
        <div className="flex flex-wrap gap-x-2"><dt className="font-bold">Reel code:</dt><dd className="break-all font-extrabold tracking-wider">{reel.code}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="font-bold">Restaurant or shop:</dt><dd>{businessName ?? "none yet"}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="font-bold">Added by:</dt><dd>{reel.added_by ?? "-"}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="font-bold">Added on:</dt><dd>{when(reel.created_at)}</dd></div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onOpen} className="min-h-12 rounded-full bg-accent px-6 text-lg font-extrabold text-onaccent">Open it</button>
        <button type="button" onClick={onDifferent} className="min-h-12 rounded-full border-2 border-line px-6 text-lg font-extrabold text-heading hover:bg-panel">Add a different reel</button>
      </div>
    </div>
  );
}
