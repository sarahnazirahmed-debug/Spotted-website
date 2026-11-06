"use client";

// Lets code (the 3D banner, the day/night mixing in the drawings) read the colours from
// src/styles/colors.css. There are NO colour codes in this file: it only asks the page for them.

const cache = new Map<string, [number, number, number]>();

// "var(--c-accent)" or "--c-accent" or any CSS colour -> [r, g, b]
export function rgbOf(colour: string): [number, number, number] {
  const hit = cache.get(colour);
  if (hit) return hit;
  const probe = document.createElement("span");
  probe.style.color = colour.startsWith("--") ? `var(${colour})` : colour;
  probe.style.display = "none";
  document.documentElement.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ["0", "0", "0"];
  probe.remove();
  const rgb: [number, number, number] = [Number(m[0]), Number(m[1]), Number(m[2])];
  cache.set(colour, rgb);
  return rgb;
}

export const cssRgb = (colour: string) => `rgb(${rgbOf(colour).join(",")})`;
export const cssRgba = (colour: string, alpha: number) => `rgba(${rgbOf(colour).join(",")},${alpha})`;

// A colour part-way between two colours (t from 0 to 1), as a CSS colour. Used for day and night.
export function mixColours(a: string, b: string, t: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `rgb(${[0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * t)).join(",")})`;
}

// A colour in the form three.js likes: "rgb(r,g,b)" works with THREE.Color.
export const forThree = cssRgb;

// The heading font as a CSS font-family list (for text drawn on the 3D banner).
export function headingFontFamily(): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = "var(--font-heading), system-ui, sans-serif";
  probe.style.display = "none";
  document.documentElement.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family;
}
