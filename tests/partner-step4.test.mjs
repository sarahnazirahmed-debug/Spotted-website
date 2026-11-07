// Step 4 (the Spotted Partner page). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FEATURES } from "../src/config/features.ts";
import { PARTNER_PRICE_CARDS, PARTNER_YEARLY_TBD } from "../src/config/pricing.ts";
import { typeOfKind, KINDS } from "../src/lib/businessRules.ts";
import { partnerLink } from "../src/config/routes.ts";

const read = (f) => readFileSync(f, "utf8");
const en = read("src/content/en.ts");

test("eight price cards with the agreed prices, and the yearly price is [TBD]", () => {
  assert.equal(PARTNER_PRICE_CARDS.length, 8);
  assert.deepEqual(
    PARTNER_PRICE_CARDS.map((c) => [c.group, c.name, c.priceAed]),
    [
      ["restaurants", "Starter", 99], ["restaurants", "Grow", 149], ["restaurants", "Main", 199], ["restaurants", "Premium", 249],
      ["restaurants", "More than one branch", 349], ["shops", "8 benefits", 99], ["shops", "14 benefits", 199], ["shops", "20+ benefits", 299],
    ],
  );
  assert.equal(PARTNER_YEARLY_TBD, "[TBD]");
});

test("anything food or drink is a Restaurant, everything else is a Shop", () => {
  for (const k of ["Restaurant", "Cafe", "Cafeteria", "Bakery", "Sweets", "Cloud kitchen", "Home kitchen"]) assert.equal(typeOfKind(k), "restaurant", k);
  for (const k of KINDS.shop) assert.equal(typeOfKind(k), "shop", k);
});

test("the agreed words are in the text file", () => {
  for (const w of [
    "Spotted Partner", "For restaurants and shops", "Let people find you from the reels they already love. See who saved your place, run your own offers, and know which influencers bring you customers.",
    "Become a Partner", "People save you from reels", "See your numbers", "Saves, visits and sales recorded through Spotted, by day, week and month.",
    "Your own offers", "Add or remove offers and items any time.", "Know your influencers", "UAE trade licence", "Branches and areas (never a home address)",
    "Add an offer", "Anything food or drink (restaurant, cafe, bakery, sweets, cloud or home kitchen) is a Restaurant. Everything else is a Shop.",
  ])
    assert.ok(en.includes(w), `missing: ${w}`);
});

test("the Partner page uses the same template as the Insider page, has no Founding box, and shows no home address field", () => {
  const p = read("src/components/insider/PartnerLanding.tsx").replace(/^\s*\/\/.*$/gm, "");
  assert.match(p, /<ProfileLanding t=\{t\} deal=\{deal\} applyHref=/); // no `extra` box
  assert.doesNotMatch(p, /Founding/i);
  assert.match(read("src/components/insider/InsiderLanding.tsx"), /ProfileLanding/);
});

test("the Partner page is at /partners, behind the Partners switch, and the top bar and Log in point to it", () => {
  assert.match(read("src/app/partners/page.tsx"), /!FEATURES\.businessPages\) notFound\(\)/);
  assert.match(read("src/components/TopBar.tsx"), /href: "\/partners"/);
  assert.equal(partnerLink("restaurants"), FEATURES.applyPage ? "/apply?type=partner" : FEATURES.businessPages ? "/partners#get-in-touch" : "/contact");
});

test("the Partner dashboard drawing has no real numbers", () => {
  const d = read("src/components/insider/DashboardDrawing.tsx").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(d, />\s*\d[\d,.]*\s*</);
});

test("the whole text bundle is never passed to a browser-side part (it can hold functions: this once broke the build)", () => {
  assert.doesNotMatch(read("src/components/insider/ProfileLanding.tsx"), /<ApplyDevice\s+t=\{t\}/);
});
