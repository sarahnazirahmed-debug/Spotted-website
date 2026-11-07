// Step 3 (the Insider page): section order, the agreed words, the price, and the draft label. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FEATURES } from "../src/config/features.ts";
import { INSIDER_PLAN, yearlyPriceAed, FOUNDING_SPOTS } from "../src/config/pricing.ts";

const read = (f) => readFileSync(f, "utf8");
const en = read("src/content/en.ts");
// the Insider and Partner pages share one template (step 4)
const page = read("src/components/insider/ProfileLanding.tsx");

test("the price is AED 249 a month and AED 2,739 a year (11 months paid, 12 given)", () => {
  assert.equal(INSIDER_PLAN.priceAed, 249);
  assert.equal(yearlyPriceAed(249), 2739);
  assert.equal(FOUNDING_SPOTS, 10);
});

test("the seven sections are in the agreed order", () => {
  const order = ["1. HERO", "2. WHY BECOME", "3. WHAT YOU NEED", "4. YOUR DASHBOARD", "5. THE DEAL", "6. EXTRA BOX", "7. CLOSING"];
  assert.match(read("src/components/insider/InsiderLanding.tsx"), /Founding/); // the 6th section on the Insider page
  let at = -1;
  for (const k of order) {
    const i = page.indexOf(k);
    assert.ok(i > at, `${k} missing or out of order`);
    at = i;
  }
});

test("the agreed words are in the text file", () => {
  for (const w of [
    "For influencers", "Spotted Insider", "Make your reels work harder", "Become an Insider", "I already have an account",
    "Why become an Insider", "See what your reels do", "Your reels live in the app", "Restaurants can see you", "One simple dashboard",
    "What you need to apply", "UAE Advertiser Permit", "Instagram and TikTok are counted first, other platforms are saved for later.",
    "Your application", "Upload PDF", "Your dashboard, on any screen", "Example layout only.", "The deal",
    "First 2 months free. No card is asked when you apply. We ask for card details after the free months, and you can cancel any time by email.",
    "Founding Insiders", "You do not have to post. If you choose to mention Spotted, please say it was a gift.", "I have an invite code",
  ])
    assert.ok(en.includes(w), `missing: ${w}`);
});

test("the hero uses the same looping phone as the landing page, and the Phone / Tablet switch has two buttons", () => {
  assert.match(page, /<PhoneLoop \/>/);
  const dev = read("src/components/insider/ApplyDevice.tsx");
  assert.match(dev, /btn\("phone"/);
  assert.match(dev, /btn\("tablet"/);
});

test("the dashboard drawing shows no real numbers: only dashes", () => {
  const d = read("src/components/insider/DashboardDrawing.tsx").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(d, />\s*\d[\d,.]*\s*</); // no digits printed as content
  assert.match(d, /t\.note/);
});

test("the Design draft label is behind a switch (ON in the draft, OFF before the site goes live)", () => {
  assert.equal(FEATURES.designDraft, true);
  assert.match(page, /FEATURES\.designDraft &&/);
});

test("the page has no emoji and no faces", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ["src/components/insider/InsiderLanding.tsx", "src/components/insider/FlipCards.tsx", "src/components/insider/ApplyDevice.tsx", "src/components/insider/DashboardDrawing.tsx"])
    assert.doesNotMatch(read(f), emoji, f);
  assert.doesNotMatch(read("src/components/insider/DashboardDrawing.tsx"), /<circle|<ellipse/);
});

test("the old Insider page is kept in the code", () => {
  assert.match(read("src/components/creators/InsiderPage.tsx"), /export function LegacyInsiderPage/);
});
