// The 6-digit code screen: plain rules for the boxes and the Verify button. (The look is in CodeEntry.tsx and VerifyButton.tsx.)
//
// THREE STATES, three colours:
//   waiting = blush with a rose line   (before and while checking)
//   wrong   = coral
//   correct = maroon
export type CodeState = "waiting" | "checking" | "wrong" | "correct";

// Only numbers, and never more than the code can have.
export const onlyDigits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

// How many boxes to draw: `length` (6), growing up to `maxLength` only if more numbers are typed (some codes have 7 or 8).
export const boxCount = (length: number, maxLength: number, typed: number) => Math.min(maxLength, Math.max(length, typed));

// The classes of the Verify button for each state. (checking looks like waiting: blush with a rose line.)
export const BUTTON_CLASS: Record<CodeState, string> = {
  waiting: "border-barline bg-paper text-charcoal",
  checking: "border-barline bg-paper text-charcoal",
  wrong: "border-coral bg-coral text-oncoral",
  correct: "border-maroonink bg-maroon text-cream",
};

// The colour of the liquid that rises inside the button.
export const LIQUID_CLASS: Record<CodeState, string> = {
  waiting: "text-barline",
  checking: "text-barline",
  wrong: "text-coral",
  correct: "text-maroon",
};

// How high the liquid is: not at all, part of the way up while checking, or full.
export const LIQUID_LEVEL: Record<CodeState, string> = {
  waiting: "",
  checking: "liquid-level-checking",
  wrong: "liquid-level-full liquid-level-wrong",
  correct: "liquid-level-full",
};

// How long the liquid takes to fill the button before the word changes (milliseconds). 0 with Reduce Motion.
export const FILL_MS = 650;
// After a correct code, how long to wait before moving on, so the "Verified" animation can be seen.
export const SUCCESS_WAIT_MS = 1100;
export const SUCCESS_WAIT_REDUCED_MS = 300;
export const successWait = (reduceMotion: boolean) => (reduceMotion ? SUCCESS_WAIT_REDUCED_MS : SUCCESS_WAIT_MS);

// Lean towards the mouse: how far the button moves for a pointer at (dx, dy) from its centre. Small and limited.
export function lean(dx: number, dy: number): { x: number; y: number } {
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  return { x: clamp(dx * 0.18, 8), y: clamp(dy * 0.28, 5) };
}
