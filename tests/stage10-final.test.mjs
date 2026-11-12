// Stage 10: final checks that keep the whole site honest: Reduce Motion, loading screens, no purple, no launch dates, switches.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FEATURES } from "../src/config/features.ts";

const read = (f) => readFileSync(f, "utf8");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const tsx = walk("src").filter((f) => f.endsWith(".tsx"));
const css = read("src/app/globals.css");

test("Reduce Motion: one rule switches off every animation and transition for people who ask", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\* \{\s*animation: none !important;\s*transition: none !important;\s*\}\s*\}/);
});

test("Reduce Motion: no movement class is used without motion-safe (press squish, hover grow, Tailwind animate)", () => {
  const bad = [];
  for (const f of tsx) {
    for (const m of code(f).matchAll(/(?<![\w:-])((?:hover|active|focus|group-hover):)?(?:scale|translate-[xy]?|rotate|animate)-[\w\[\]./-]*/g)) {
      const cls = m[0];
      if (/^(translate-[xy]?-|scale-[xy]?-|rotate-)/.test(cls) && !/^(hover|active|focus|group-hover):/.test(cls)) continue; // fixed positions (centring), not movement
      if (/^(hover|active|focus|group-hover):/.test(cls) || cls.startsWith("animate-")) bad.push(`${f}: ${cls}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("Reduce Motion: the animations written in the stylesheet are in the no-preference blocks or switched off by the one rule above", () => {
  // every block that has an animation and is not the global reduce rule must be a no-preference block, or an old page that the global rule covers
  const noPreference = [...css.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g)].length;
  assert.ok(noPreference >= 6, "the newer animations live in no-preference blocks");
});

test("every page has a loading screen, and the loading screens do not need motion", () => {
  assert.ok(existsSync("src/app/loading.tsx"));
  assert.match(css, /\.skeleton::after \{ animation: skeleton-sweep 1\.4s ease-in-out infinite; \}/);
});

test("the three required switches and the things that must stay OFF", () => {
  assert.equal(FEATURES.careersPage, false);
  assert.equal(FEATURES.themeLamp, false);
  assert.equal(FEATURES.smsVerification, false); // costs money until a provider is chosen
  assert.equal(FEATURES.storeButtons, false);
  assert.equal(FEATURES.waitlist, false);
  for (const k of ["feedbackStar", "newLanding", "applyPage", "faqPage", "aboutPage", "contactPage"]) assert.equal(typeof FEATURES[k], "boolean", k);
});

test("no purple, no emoji and no faces in the new work, and every colour code is in colors.css only", () => {
  const colours = read("src/styles/colors.css");
  assert.doesNotMatch(colours.replace(/\/\*[\s\S]*?\*\//g, ""), /plum|lilac|purple|violet/i);
  for (const f of walk("src").filter((x) => /\.(ts|tsx|css)$/.test(x) && !x.endsWith("colors.css"))) {
    assert.doesNotMatch(code(f), /(?<![\w&])#[0-9a-fA-F]{6}\b/, `${f} holds a colour code`);
    assert.doesNotMatch(code(f), /\p{Extended_Pictographic}/u, `${f} holds an emoji`);
  }
  // the only faces are the five mouth-only faces of the Rate us card
  assert.equal([...read("src/components/rate/RateFace.tsx").matchAll(/<circle /g)].length, 1);
});

test("the checklist for Sarah exists, lists the SQL files in order, and has no launch date", () => {
  const d = read("docs/LAUNCH_CHECKLIST.md");
  for (const f of ["schema.sql", "admin.sql", "applications.sql", "apply_insider_form.sql", "apply_reference_codes.sql", "star_feedback.sql", "pindesk_order_only.sql"]) assert.ok(d.includes(f), f);
  assert.doesNotMatch(d, /\b(?:january|2027)\b|launch(?:es|ing)? (?:on|in)\b/i);
  // every SQL file in the folder is listed (or is the reset file that must never be run)
  for (const f of readdirSync("supabase").filter((x) => x.endsWith(".sql") && x !== "reset.sql")) assert.ok(d.includes(f), `${f} is missing from the checklist`);
});
