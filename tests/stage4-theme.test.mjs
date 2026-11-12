// Stage 4: colours (no purple), light and dark theme, the sun/moon button with the growing-circle reveal.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FEATURES } from "../src/config/features.ts";
import { THEME_INIT_SCRIPT, THEME_KEY } from "../src/lib/theme-script.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const css = read("src/styles/colors.css");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

// ---------------------------------------------------------------- colours
function hueOf(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.1) return null; // grey
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: (h * 60 + 360) % 360, sat: d / (1 - Math.abs(mx + mn - 1) + 1e-9) };
}

test("the palette is the agreed maroon, rose and coral colours, written in colors.css", () => {
  const want = {
    "--brand-maroon": "#5c0f24", "--rose": "#d6598f", "--rose-line": "#e8a9b6", "--blush": "#f4d7d4", "--soft-pink": "#fdeff1", "--coral": "#ff6b6b",
    "--ink": "#1e0a10", "--cocoa": "#2e1219", "--wine": "#3a0e1b", // the dark theme: page, cards, top bar
  };
  for (const [name, hex] of Object.entries(want)) assert.match(css, new RegExp(`${name}:\\s*${hex}\\b`, "i"), name);
});

test("NO PURPLE anywhere: not one colour code in colors.css is purple, and no file talks about plum, lilac or purple", () => {
  const hexes = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
  assert.ok(hexes.length >= 12);
  for (const h of hexes) {
    const x = hueOf(h);
    assert.ok(!x || !(x.hue > 250 && x.hue < 320 && x.sat > 0.15), `${h} is purple`);
  }
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /plum|lilac|purple|violet/i);
  for (const f of walk("src").filter((x) => /\.(ts|tsx|css)$/.test(x) && !x.startsWith("src/components/admin"))) assert.doesNotMatch(code(f), /\b(bg|text|border)-(plum|lilac|purple|violet)/, f);
});

test("the dark theme uses the agreed values: page, cards, top bar, soft text, buttons", () => {
  const dark = css.slice(css.indexOf(':root,\n:root[data-theme="dark"]'), css.indexOf(':root[data-theme="light"]'));
  assert.match(dark, /--page-base:\s*var\(--ink\)/); // page #1E0A10
  assert.match(dark, /--card:\s*var\(--cocoa\)/); // cards #2E1219
  assert.match(dark, /--maroon:\s*var\(--wine\)/); // top bar #3A0E1B
  assert.match(dark, /--muted-text:\s*var\(--rose-line\)/); // soft text #E8A9B6
  assert.match(dark, /--box:\s*var\(--cocoa\)/);
  assert.match(css, /--accent:\s*var\(--ember\)/); // buttons coral #FF6B6B
  assert.match(css, /--ember:\s*var\(--coral\)/);
  assert.match(css, /--dark-on-coral:\s*var\(--ink\)/); // dark words on coral, in both themes
});

test("the light theme keeps the cream design", () => {
  const light = css.slice(css.indexOf(':root[data-theme="light"]'), css.indexOf("/* no scripts"));
  assert.match(light, /--page-base:\s*var\(--page-light\)/);
  assert.match(light, /--maroon:\s*var\(--brand-maroon\)/);
  assert.match(light, /--card:\s*var\(--cream\)/);
  assert.match(light, /--dark-text:\s*var\(--ink\)/);
});

test("without scripts the device setting still decides (media query)", () => {
  assert.match(css, /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme\]\)/);
});

test("maroon used as TEXT or an OUTLINE has its own name that turns soft rose in the dark theme", () => {
  assert.match(css, /--maroon-ink:\s*var\(--rose-line\)/); // dark
  assert.match(css, /--maroon-ink:\s*var\(--brand-maroon\)/); // light
  assert.match(css, /--color-maroonink:\s*var\(--maroon-ink\)/);
  for (const f of walk("src").filter((x) => x.endsWith(".tsx"))) {
    assert.doesNotMatch(code(f), /(?<![\w-])(text|border)-maroon(?![\w-])/, `${f}: use text-maroonink / border-maroonink`);
    assert.doesNotMatch(code(f), /(?<![\w-])bg-cream(?![\w/-])/, `${f}: cards use bg-card`);
    for (const line of code(f).split("\n")) if (/(?<![\w-])bg-coral(?![\w/-])/.test(line)) assert.doesNotMatch(line, /text-darktext/, `${f}: words on coral use text-oncoral`);
  }
});

// ---------------------------------------------------------------- the default follows the device
function runScript({ saved, systemDark, storageThrows = false }) {
  const listeners = [];
  const doc = { documentElement: { dataset: {} }, head: { appendChild() {} }, querySelector: () => null, createElement: () => ({}) };
  const mq = { matches: systemDark, addEventListener: (_t, fn) => listeners.push(fn) };
  const store = saved === undefined ? {} : { [THEME_KEY]: saved };
  const ls = { getItem: (k) => { if (storageThrows) throw new Error("blocked"); return store[k] ?? null; }, setItem: (k, v) => { store[k] = v; } };
  new Function("document", "window", "localStorage", THEME_INIT_SCRIPT)(doc, { matchMedia: () => mq }, ls);
  return { theme: () => doc.documentElement.dataset.theme, systemChanges: (dark) => listeners.forEach((fn) => fn({ matches: dark })), save: (v) => (store[THEME_KEY] = v) };
}

test("with no saved choice the theme follows the device setting", () => {
  assert.equal(runScript({ systemDark: true }).theme(), "dark");
  assert.equal(runScript({ systemDark: false }).theme(), "light");
});

test("a saved choice wins over the device setting", () => {
  assert.equal(runScript({ saved: "light", systemDark: true }).theme(), "light");
  assert.equal(runScript({ saved: "dark", systemDark: false }).theme(), "dark");
  assert.equal(runScript({ saved: "nonsense", systemDark: false }).theme(), "light"); // junk is ignored
});

test("blocked storage still works: it follows the device", () => {
  assert.equal(runScript({ systemDark: false, storageThrows: true }).theme(), "light");
  assert.equal(runScript({ systemDark: true, storageThrows: true }).theme(), "dark");
});

test("while nothing is saved, a change of the device setting is followed; after a choice it is not", () => {
  const s = runScript({ systemDark: true });
  s.systemChanges(false);
  assert.equal(s.theme(), "light");
  s.save("dark"); // the visitor pressed the button
  s.systemChanges(false);
  assert.equal(s.theme(), "light"); // unchanged by the device from now on (it only follows when nothing is saved)
  const t = runScript({ saved: "dark", systemDark: true });
  t.systemChanges(false);
  assert.equal(t.theme(), "dark");
});

test("the page no longer starts with a fixed theme", () => {
  assert.doesNotMatch(code("src/app/layout.tsx"), /data-theme="dark"/);
  assert.match(read("src/app/layout.tsx"), /THEME_INIT_SCRIPT/);
});

// ---------------------------------------------------------------- the sun/moon button
test("the sun/moon button is in the top bar on every screen size, and the lamp is retired", () => {
  const bar = code("src/components/TopBar.tsx");
  assert.match(bar, /<ThemeToggle \/>/);
  // it sits OUTSIDE the group that disappears below 1024px, so phones have it too
  assert.ok(bar.indexOf("<ThemeToggle />") < bar.indexOf("hidden items-center gap-2 lg:flex"));
  const t = code("src/components/ThemeToggle.tsx");
  assert.match(t, /aria-label=\{next === "light" \? "Switch to the light theme" : "Switch to the dark theme"\}/);
  assert.match(t, /name=\{theme === "dark" \? "sun" : "moon"\}/);
  assert.match(t, /size-11/); // 44px tap target
  assert.match(t, /focus-visible:outline/);
  assert.match(t, /motion-safe:active:scale-95/);
  // retired
  assert.equal(FEATURES.themeLamp, false);
  for (const f of ["src/components/SiteChrome.tsx", "src/components/Story.tsx"]) assert.doesNotMatch(code(f), /ThemeLamp|themeLamp/, f);
  assert.ok(existsSync("src/components/ThemeLamp.tsx"), "the lamp code is kept");
  // the two pictures are objects (no faces)
  const icons = read("src/components/site/Icons.tsx");
  assert.match(icons, /case "sun":/);
  assert.match(icons, /case "moon":/);
});

// ---------------------------------------------------------------- the growing circle (run with fake browser parts)
function fakeBrowser({ reduce = false, viewTransitions = true, width = 1000, height = 600 } = {}) {
  const calls = { setTheme: [], startVT: 0, animate: [], classes: new Set(), timeouts: [] };
  const root = {
    dataset: {},
    classList: { add: (c) => calls.classes.add(c), remove: (c) => calls.classes.delete(c) },
    animate: (kf, opts) => calls.animate.push({ kf, opts }),
  };
  const doc = { documentElement: root, querySelector: () => null };
  if (viewTransitions) doc.startViewTransition = function (update) { calls.startVT++; update(); return { ready: Promise.resolve() }; };
  globalThis.document = doc;
  globalThis.localStorage = { setItem: (k, v) => calls.setTheme.push([k, v]) };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "#000" });
  globalThis.window = { innerWidth: width, innerHeight: height, matchMedia: () => ({ matches: reduce }), setTimeout: (fn, ms) => calls.timeouts.push({ fn, ms }) };
  return { calls, root };
}

test("Reduce Motion: the theme switches at once, with no circle and no fade", async () => {
  const { switchTheme } = await import("../src/lib/theme.ts");
  const { calls, root } = fakeBrowser({ reduce: true });
  switchTheme("light", { x: 500, y: 30 });
  assert.equal(root.dataset.theme, "light");
  assert.equal(calls.startVT, 0);
  assert.equal(calls.animate.length, 0);
  assert.equal(calls.classes.size, 0);
  assert.deepEqual(calls.setTheme, [[THEME_KEY, "light"]]); // and it is remembered
});

test("a browser without View Transitions gets a soft fade (a class for half a second), not a jump with no animation", async () => {
  const { switchTheme } = await import("../src/lib/theme.ts");
  const { calls, root } = fakeBrowser({ viewTransitions: false });
  switchTheme("dark", { x: 500, y: 30 });
  assert.equal(root.dataset.theme, "dark");
  assert.ok(calls.classes.has("theme-fade"));
  assert.equal(calls.timeouts[0].ms, 500);
  calls.timeouts[0].fn();
  assert.ok(!calls.classes.has("theme-fade"));
});

test("with View Transitions the NEW theme grows as a circle from the button in 0.9 seconds", async () => {
  const { switchTheme, THEME_REVEAL_MS } = await import("../src/lib/theme.ts");
  const { calls, root } = fakeBrowser({ width: 1000, height: 600 });
  switchTheme("light", { x: 900, y: 30 });
  assert.equal(calls.startVT, 1);
  assert.equal(root.dataset.theme, "light"); // the update ran inside the transition
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.animate.length, 1);
  const { kf, opts } = calls.animate[0];
  assert.equal(THEME_REVEAL_MS, 900);
  assert.equal(opts.duration, 900);
  assert.equal(opts.pseudoElement, "::view-transition-new(root)");
  assert.equal(kf.clipPath[0], "circle(0px at 900px 30px)"); // starts as nothing, at the button
  // ends big enough to cover the farthest corner of the window
  const far = Math.hypot(900, 570); // from (900,30) to the bottom-left corner (0,600)
  assert.equal(kf.clipPath[1], `circle(${far}px at 900px 30px)`);
});

test("the CSS switches off the browser's own cross-fade, and has the fade fallback and a Reduce Motion safety", () => {
  const g = read("src/app/globals.css");
  assert.match(g, /::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation: none;/);
  assert.match(g, /html\.theme-fade/);
  const reduceBlock = g.slice(g.lastIndexOf("@media (prefers-reduced-motion: reduce) {\n  ::view-transition-group(*)"));
  assert.match(reduceBlock, /animation: none !important/);
  assert.match(reduceBlock, /html\.theme-fade, html\.theme-fade \* \{ transition: none !important; \}/);
});
