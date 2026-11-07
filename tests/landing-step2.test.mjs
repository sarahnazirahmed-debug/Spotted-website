// Step 2 (landing page): the menu panel, the phone loop, the footer and the placeholder pages. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FEATURES } from "../src/config/features.ts";

const read = (f) => readFileSync(f, "utf8");
const en = read("src/content/en.ts");

test("the menu panel has the two groups with the agreed names and lines", () => {
  for (const w of ["Spotted Crew", "Join Spotted", '"Admin"', '"Staff"', "For influencers", "For restaurants and shops", "Work with the crew"]) assert.ok(en.includes(w), `${w} missing`);
  const bar = read("src/components/TopBar.tsx");
  assert.match(bar, /m\.crew/);
  assert.match(bar, /m\.join/);
  assert.match(bar, /aria-expanded=\{open\}/); // the three-bar button says whether the panel is open
  assert.match(bar, /Escape/); // it closes with the keyboard
});

test("the top bar has a coral Get notified button and a small Admin link", () => {
  const bar = read("src/components/TopBar.tsx");
  assert.match(bar, /bg-coral[^"]*text-darktext/);
  assert.match(bar, /item\(ADMIN/);
});

test("the phone loop: about 7 seconds, repeats, and Reduce Motion shows only the final Place saved screen", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /phone-reel-scene 7s [^;]*infinite/);
  // the moving version is only switched on when motion is allowed
  const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
  assert.match(motion, /\.phone-reel \{ animation/);
  // the plain (still) styles are the final screen: the reel is hidden, Place saved is visible
  assert.match(css, /\.phone-reel \{\s*opacity: 0;/);
  assert.match(css, /\.phone-done \{\s*opacity: 1;/);
  const phone = read("src/components/site/PhoneLoop.tsx");
  assert.match(phone, /p\.saved/);
  assert.match(phone, /p\.near/);
  assert.match(phone, /p\.save\b/);
  assert.match(read("src/components/site/HomePage.tsx"), /<PhoneLoop \/>/);
});

test("the phone picture has no faces, eyes or people", () => {
  const phone = read("src/components/site/PhoneLoop.tsx").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(phone, /<circle|<ellipse/); // no round shapes that could read as eyes
  assert.doesNotMatch(phone, /face|eye|person|people|smile/i);
});

test("the footer: Terms, Privacy policy, Confidentiality agreement, WhatsApp, email (shown once it works)", () => {
  const f = read("src/components/Footer.tsx");
  assert.match(f, /SocialButtons instagram=\{false\}/);
  assert.match(f, /CONTACT\.emailLive/);
  assert.equal(JSON.stringify(Object.keys(FEATURES).includes("legalPlaceholders")), "true");
});

test("Terms, Privacy and Confidentiality are empty Coming soon placeholders while legalPlaceholders is ON", () => {
  assert.equal(FEATURES.legalPlaceholders, true);
  for (const f of ["src/app/terms/page.tsx", "src/app/privacy/page.tsx"]) assert.match(read(f), /FEATURES\.legalPlaceholders\) return <LegalPlaceholder/, f);
  assert.match(read("src/app/confidentiality/page.tsx"), /LegalPlaceholder/);
  // the draft texts are still in the code
  assert.match(read("src/components/pages/LegalPages.tsx"), /export function TermsPage/);
});

test("no emoji in the new files", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ["src/components/TopBar.tsx", "src/components/site/PhoneLoop.tsx", "src/content/en.ts", "src/components/Footer.tsx"]) assert.doesNotMatch(read(f), emoji, f);
});
