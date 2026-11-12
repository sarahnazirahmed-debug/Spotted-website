"use client";

// The theme (light or dark), remembered in the browser. Default: the device setting (see theme-script.ts).
// The real value lives on <html data-theme="...">; this file reads and changes it.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script.ts";

export type Theme = "light" | "dark";

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  // keep the browser bar colour in step with the page colour
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // Private mode or blocked storage: the theme still switches, it just is not remembered.
  }
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "dark");
  return { theme, toggle: () => setTheme(read() === "light" ? "dark" : "light") };
}

// The sun/moon button: the NEW theme grows as a circle out of the button (the View Transitions API with a clip-path circle, 0.9 seconds).
//   * A browser that cannot do that gets a soft fade instead.
//   * With Reduce Motion on, the theme switches instantly.
export const THEME_REVEAL_MS = 900;
export function switchTheme(next: Theme, origin: { x: number; y: number }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return setTheme(next);
  const doc = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
  if (typeof doc.startViewTransition !== "function") {
    const root = document.documentElement;
    root.classList.add("theme-fade");
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-fade"), 500);
    return;
  }
  const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
  const transition = doc.startViewTransition(() => setTheme(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: THEME_REVEAL_MS, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      // the browser skipped the animation: the theme has already switched
    });
}
