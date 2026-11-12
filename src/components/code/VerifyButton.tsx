"use client";

// The Verify button for the code screens.
//   * It LEANS toward the mouse a little (only a real mouse, and never with Reduce Motion).
//   * Pressed: two waves of liquid rise inside it.
//   * Correct code: the liquid fills it (maroon), the letters of "Verify" DROP away and "Verified" drops in.
//   * Wrong code: coral, and it says "Try again".
// Three colours: waiting = blush with a rose line, wrong = coral, correct = maroon. See src/lib/codeEntry.ts.
// With Reduce Motion there is no leaning, no waves and no dropping: the colour and the word just change.
import { useEffect, useRef, useState } from "react";
import { text } from "@/content";
import { BUTTON_CLASS, FILL_MS, LIQUID_CLASS, LIQUID_LEVEL, lean, type CodeState } from "@/lib/codeEntry";

export type ButtonWords = { verify: string; checking: string; tryAgain: string; verified: string };
const wordFor = (w: ButtonWords, s: CodeState) => ({ waiting: w.verify, checking: w.checking, wrong: w.tryAgain, correct: w.verified })[s];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Letters({ word }: { word: string }) {
  return (
    <>
      {[...word].map((c, i) => (
        <span key={i} className="letter-in" style={{ "--i": i } as React.CSSProperties}>
          {c === " " ? " " : c}
        </span>
      ))}
    </>
  );
}

// `words` lets another screen (for example the Rate us card: "Submit" then "Submitted") use the same button with its own words.
// `onPress`: use it when the button sits inside ANOTHER form (a form inside a form is not allowed): it becomes a plain button that calls this.
export default function VerifyButton({ state, disabled = false, words = text.codeEntry, onPress }: { state: CodeState; disabled?: boolean; words?: ButtonWords; onPress?: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState<CodeState>(state); // the word on the button (it waits for the liquid to fill)
  const shownRef = useRef<CodeState>(state);
  const [leaving, setLeaving] = useState<string | null>(null); // the old word, dropping away

  useEffect(() => {
    if (shownRef.current === state) return;
    const wait = state === "correct" && !reduced() ? FILL_MS : 0;
    const t = window.setTimeout(() => {
      setLeaving(wordFor(words, shownRef.current));
      shownRef.current = state;
      setShown(state);
      window.setTimeout(() => setLeaving(null), 800);
    }, wait);
    return () => window.clearTimeout(t);
  }, [state, words]);

  const locked = disabled || state === "checking" || state === "correct";

  function pull(e: React.PointerEvent) {
    const b = button.current;
    if (!b || locked || e.pointerType !== "mouse" || reduced()) return;
    const r = b.getBoundingClientRect();
    const { x, y } = lean(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    b.style.transform = `translate(${x}px, ${y}px)`;
  }
  const settle = () => {
    if (button.current) button.current.style.transform = "";
  };

  const textClass = shown === "correct" ? "text-cream" : shown === "wrong" ? "text-oncoral" : "text-charcoal";
  return (
    // the padding round the button makes the lean start a little BEFORE the pointer reaches it
    <div onPointerMove={pull} onPointerLeave={settle} className="-m-4 p-4">
      <button
        ref={button}
        type={onPress ? "button" : "submit"}
        onClick={onPress}
        disabled={locked}
        className={`relative isolate flex min-h-12 w-full items-center justify-center overflow-hidden rounded-full border-2 px-7 font-extrabold transition-[transform,background-color,border-color] duration-150 motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral ${BUTTON_CLASS[state]}`}
      >
        {/* the liquid: two waves on top of a body of the same colour */}
        <span aria-hidden="true" className={`liquid ${LIQUID_CLASS[state]} ${LIQUID_LEVEL[state]}`}>
          <svg className="liquid-wave liquid-wave-a" viewBox="0 0 200 12" preserveAspectRatio="none">
            <path fill="currentColor" d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 V12 H0 Z" />
          </svg>
          <svg className="liquid-wave liquid-wave-b" viewBox="0 0 200 12" preserveAspectRatio="none" style={{ opacity: 0.55 }}>
            <path fill="currentColor" d="M0 6 Q25 12 50 6 T100 6 T150 6 T200 6 V12 H0 Z" />
          </svg>
          <span className="liquid-body bg-current" />
        </span>
        <span className={`relative z-10 flex min-h-6 items-center justify-center ${textClass}`}>
          <span key={shown} aria-live="polite">
            <Letters word={wordFor(words, shown)} />
          </span>
          {leaving && (
            <span aria-hidden="true" className="letters-out">
              {[...leaving].map((c, i) => (
                <span key={i} style={{ "--i": i } as React.CSSProperties}>
                  {c === " " ? " " : c}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
