"use client";

// The phone picture in the hero: a calm loop of about 7 seconds that repeats.
//   1. A reel appears.   2. "Save this place" is tapped (a small ring pulses).
//   3. The screen changes to "Place saved" and a "Near you" reminder card appears.
// With Reduce Motion turned on, only the final "Place saved" screen shows, with no movement
// (the animation itself is in globals.css and is only switched on when motion is allowed).
// The picture has no faces, eyes or people: only shapes, a pin, a bookmark and words.
// A small button under the phone pauses the loop (anything that moves for more than 5 seconds needs one).
import { useState } from "react";
import { text } from "@/content";
import { Icon } from "./Icons";

export default function PhoneLoop() {
  const p = text.phone;
  const [paused, setPaused] = useState(false);
  return (
    <div className="phone-loop mx-auto flex w-full max-w-[17rem] flex-col items-center" data-paused={paused}>
      <div role="img" aria-label={p.label} className="relative aspect-[9/18] w-full rounded-[2.5rem] border-[6px] border-onbar/90 bg-bar p-1.5 shadow-2xl">
        {/* the speaker slot: a plain bar, not a camera dot */}
        <span className="absolute left-1/2 top-2.5 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-onbar/30" aria-hidden="true" />
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-onbar" aria-hidden="true">
          {/* SCENE 1: the reel (hidden in the still version) */}
          <div className="phone-scene phone-reel bg-gradient-to-b from-bar via-bar to-coral">
            <div className="absolute inset-x-0 top-[22%] flex justify-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-onbar/20 text-onbar">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5l12 7-12 7z" />
                </svg>
              </span>
            </div>
            <div className="absolute inset-x-4 top-[46%] text-onbar">
              <p className="flex items-center gap-1.5 font-bar text-sm font-bold">
                <Icon name="pin" size={16} />
                {p.reelCaption}
              </p>
              <p className="mt-0.5 font-bar text-xs font-medium opacity-80">{p.reelArea}</p>
            </div>
            <div className="absolute inset-x-4 bottom-6">
              <div className="relative">
                <span className="phone-ring absolute -inset-1 rounded-full border-2 border-onbar" />
                <span className="phone-button flex min-h-11 items-center justify-center gap-2 rounded-full bg-coral px-4 font-bar text-sm font-bold text-darktext">
                  <Icon name="bookmark" size={16} />
                  {p.save}
                </span>
              </div>
            </div>
          </div>

          {/* SCENE 2: Place saved, and the Near you reminder (this is the still version) */}
          <div className="phone-scene phone-done flex flex-col bg-onbar px-4 pt-14 text-darktext">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral text-darktext">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="mt-3 text-center font-brand text-lg font-bold">{p.saved}</p>
            <p className="mt-1 text-center font-bar text-xs font-medium">{p.savedNote}</p>
            <div className="phone-near mt-auto mb-5 flex gap-3 rounded-2xl bg-bar p-3 text-onbar shadow-lg">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-coral text-darktext">
                <Icon name="bell" size={18} />
              </span>
              <span>
                <span className="block font-bar text-sm font-bold">{p.near}</span>
                <span className="block font-bar text-xs font-medium opacity-90">{p.nearNote}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((v) => !v)}
        aria-pressed={paused}
        className="phone-pause mt-3 min-h-11 rounded-full px-4 font-bar text-sm font-semibold text-paper underline focus-visible:outline-2 focus-visible:outline-coral"
      >
        {paused ? p.play : p.pause}
      </button>
    </div>
  );
}
