"use client";

// The sun/moon button in the top bar. It switches between the light and the dark theme.
// The new theme grows as a circle out of the button (about 0.9 seconds); Reduce Motion switches at once. See src/lib/theme.ts.
import { useRef } from "react";
import { switchTheme, useTheme } from "@/lib/theme";
import { Icon } from "./site/Icons";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  const button = useRef<HTMLButtonElement>(null);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      ref={button}
      type="button"
      onClick={() => {
        const r = button.current?.getBoundingClientRect();
        switchTheme(next, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: 0 });
      }}
      aria-label={next === "light" ? "Switch to the light theme" : "Switch to the dark theme"}
      title={next === "light" ? "Light theme" : "Dark theme"}
      className={`flex size-11 items-center justify-center rounded-full text-onbar transition hover:text-coral motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-coral ${className}`}
    >
      {/* the picture shows the theme you will get: a sun in the dark theme, a moon in the light theme */}
      <Icon name={theme === "dark" ? "sun" : "moon"} size={22} />
    </button>
  );
}
