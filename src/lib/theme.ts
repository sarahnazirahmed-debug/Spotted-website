"use client";

// The theme (light or dark), remembered in the browser. Default: dark.
// The real value lives on <html data-theme="...">; this file reads and changes it.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

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
