"use client";

// The 6-digit code boxes. One real input (so pasting, the phone's "code from SMS or email" suggestion and screen readers all work)
// with boxes drawn on top. Each digit ROLLS in like a slot machine (a strip of numbers that rolls down to the digit).
// A pasted code rolls in one digit after another. A wrong code shakes the boxes. With Reduce Motion the digits just appear.
import { useState } from "react";
import { boxCount, onlyDigits, type CodeState } from "@/lib/codeEntry";

export default function CodeEntry({
  id,
  label,
  value,
  onChange,
  state = "waiting",
  length = 6,
  maxLength = length,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (digits: string) => void;
  state?: CodeState;
  length?: number;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [pastedFrom, setPastedFrom] = useState<number | null>(null); // set when several digits arrive at once
  const n = boxCount(length, maxLength, value.length);
  const active = Math.min(value.length, n - 1);
  const locked = state === "checking" || state === "correct";

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <div className={`relative rounded-2xl ${state === "wrong" ? "code-shake" : ""} ${focused ? "outline outline-2 outline-offset-4 outline-coral" : ""}`}>
        <div aria-hidden="true" className="flex justify-center gap-2 sm:gap-3">
          {Array.from({ length: n }, (_, i) => {
            const d = value[i];
            const border = state === "wrong" ? "border-coral" : state === "correct" ? "border-maroonink" : focused && i === active ? "border-coral" : "border-barline";
            const fill = state === "correct" ? "bg-maroon text-cream" : "bg-paper text-charcoal";
            return (
              <span key={i} className={`flex h-14 w-11 items-center justify-center rounded-xl border-2 text-2xl font-extrabold transition-colors sm:h-16 sm:w-12 ${fill} ${border}`}>
                {d !== undefined && (
                  <span className="reel">
                    <span
                      key={`${i}-${d}`}
                      className="reel-strip"
                      style={{ "--d": Number(d), "--delay": `${pastedFrom !== null && i >= pastedFrom ? (i - pastedFrom) * 70 : 0}ms` } as React.CSSProperties}
                    >
                      {Array.from({ length: 20 }, (_, k) => (
                        <span key={k} className="block h-[1.2em] text-center">
                          {k % 10}
                        </span>
                      ))}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <input
          id={id}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={maxLength}
          readOnly={locked}
          aria-invalid={state === "wrong"}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = onlyDigits(e.target.value, maxLength);
            setPastedFrom(next.length - value.length > 1 ? value.length : null);
            onChange(next);
          }}
          className="absolute inset-0 h-full w-full cursor-text rounded-2xl bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>
    </div>
  );
}
