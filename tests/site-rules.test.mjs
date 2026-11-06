// Tests that check the site rules (SITE_RULES.md) which a computer can check. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Every file under src/ (without the one colours file, which is allowed to hold colour codes).
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk("src").filter((f) => /\.(ts|tsx|css)$/.test(f));
const withoutColours = files.filter((f) => !f.endsWith("colors.css"));
const text = (f) => readFileSync(f, "utf8");

// Remove // and /* */ comments so words in explanations do not count.
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("no colour codes outside src/styles/colors.css", () => {
  const bad = [];
  for (const f of withoutColours) {
    const s = noComments(text(f));
    // hex codes, but not page links like href="#top" (those have letters beyond a-f or are short ids)
    const hex = s.match(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![\w-])/g) ?? [];
    const real = hex.filter((h) => !["#top", "#bar"].includes(h));
    const fn = s.match(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g) ?? [];
    // palette.ts builds "rgb(...)" strings from numbers it reads from the page: no codes of its own
    if (f.endsWith("palette.ts")) continue;
    if (real.length || fn.length) bad.push(`${f}: ${[...real, ...fn].join(" ")}`);
  }
  assert.deepEqual(bad, []);
});

test("the old purple colour names and Tailwind's built-in black and white are not used", () => {
  const re = /(?<![\w-])(?:bg|text|ring|border|from|to|via|fill|stroke)-(?:brand|deep|lilac|spot-red|sun|ink|white|black)(?![\w-])/;
  const bad = withoutColours.filter((f) => re.test(noComments(text(f))));
  assert.deepEqual(bad, []);
});

test("every colour name used in the code exists in colors.css", () => {
  const defined = new Set([...text("src/styles/colors.css").matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set();
  for (const f of withoutColours) {
    for (const m of text(f).matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1]);
    for (const m of text(f).matchAll(/rgbOf|cssRgb|cssRgba|forThree\(\s*"(--[a-z0-9-]+)"/g)) if (m[1]) used.add(m[1]);
  }
  // the fonts come from src/styles/fonts.ts (next/font); --d is an animation delay
  const fromFonts = new Set(["--font-heading", "--font-body", "--d"]); // --d = an animation delay, not a colour
  const missing = [...used].filter((n) => !defined.has(n) && !fromFonts.has(n) && !n.startsWith("--tw-"));
  assert.deepEqual(missing, []);
});

test("there are no launch dates on the site", () => {
  const re = /\b(?:january|2027)\b|01\.01|\b1 jan\b/i;
  const bad = [];
  for (const f of files) {
    const s = noComments(text(f));
    if (re.test(s)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test("the site says 'Coming soon' and has no date in features.ts", () => {
  const s = text("src/config/features.ts");
  assert.match(s, /COMING SOON/);
  assert.match(s, /storeNote: "Coming soon"/);
});

test("fonts are chosen in one file only", () => {
  const bad = files.filter((f) => !f.endsWith("fonts.ts") && /next\/font/.test(text(f)));
  assert.deepEqual(bad, []);
});

test("creator credit is hidden by default and Insider has no free plan", () => {
  assert.match(text("src/config/features.ts"), /creatorCredit: false/);
  const insider = text("src/components/creators/InsiderPage.tsx");
  assert.doesNotMatch(insider, /Free vs|Creator Pro|AED 0/);
  assert.match(insider, /AED 249/);
  assert.match(insider, /First 2 months free/);
});

test("the old /influencers address redirects to /insider", () => {
  assert.match(text("next.config.ts"), /source: "\/influencers", destination: "\/insider"/);
});

test("SITE_RULES.md has the new rules", () => {
  const s = text("SITE_RULES.md");
  for (const word of ["src/styles/colors.css", "No launch dates", "never draw people", "Never copy or scrape", "English only for now", "ready for more languages", "paid only"]) {
    assert.ok(s.toLowerCase().includes(word.toLowerCase()), `missing: ${word}`);
  }
});

test("the site can be built as plain files for Cloudflare Pages", () => {
  const pkg = JSON.parse(text("package.json"));
  assert.equal(pkg.scripts["build:cloudflare"], "NEXT_OUTPUT=export next build");
  assert.match(text("next.config.ts"), /output: "export"/);
  assert.match(text("public/_redirects"), /^\/influencers \/insider 301$/m);
  assert.equal(text(".node-version").trim(), "22");
  // a plain-files site has no server code, so none of these may appear
  for (const f of files) {
    const s = noComments(text(f));
    assert.doesNotMatch(s, /from "next\/server"|from "next\/headers"|"use server"/, `${f} needs a server`);
  }
  assert.ok(!files.some((f) => /[\\/]route\.tsx?$/.test(f) || /[\\/]middleware\.tsx?$/.test(f)), "a route or middleware file needs a server");
});
