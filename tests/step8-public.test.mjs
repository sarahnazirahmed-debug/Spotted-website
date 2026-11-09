// Step 8 (the public website): prices come from the Pin Desk settings and say "Price to confirm" until typed, two Partner tiers with "See more", the reward is the partner's choice,
// Careers hidden, the new landing page look, and the Join buttons going to the dashboard's forms. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FEATURES } from "../src/config/features.ts";
import { PARTNER_PRICE_CARDS, PRICE_TO_CONFIRM, priceLabel, planPriceKey, cardPriceKey } from "../src/config/pricing.ts";

const read = (f) => readFileSync(f, "utf8");
const strip = (s) => s.replace(/^\s*\/\/.*$/gm, ""); // remove // comment lines

test("a plan with no price typed on the Pin Desk says Price to confirm; a typed price shows as AED", () => {
  assert.equal(PRICE_TO_CONFIRM, "Price to confirm");
  assert.equal(priceLabel(null), "Price to confirm");
  assert.equal(priceLabel(149), "AED 149");
  assert.equal(priceLabel(1099), "AED 1,099");
});

test("every plan on the website maps to a price box on the Pin Desk, and the keys match the dashboard", () => {
  const keys = ["restaurants.starter", "restaurants.grow", "restaurants.main", "restaurants.premium", "restaurants.branches", "shops.starter", "shops.plus", "shops.pro", "insider"];
  const used = new Set([
    ...PARTNER_PRICE_CARDS.map((c) => cardPriceKey(c)),
    planPriceKey("restaurants", "starter"), planPriceKey("restaurants", "grow"), planPriceKey("restaurants", "main"), planPriceKey("restaurants", "premium"), planPriceKey("restaurants", "multi-branch"),
    planPriceKey("shops", "starter"), planPriceKey("shops", "plus"), planPriceKey("shops", "pro"), planPriceKey("insider", "insider"),
  ]);
  assert.deepEqual([...used].sort(), [...keys].sort());
});

test("the website reads prices and links from the settings, never from typed numbers", () => {
  for (const f of ["src/components/insider/PartnerLanding.tsx", "src/components/insider/InsiderLanding.tsx", "src/components/creators/InsiderPage.tsx", "src/components/site/PricingPage.tsx", "src/components/apply/ApplyForm.tsx", "src/components/site/SocialButtons.tsx"]) {
    assert.match(read(f), /useSiteSettings\(\)/, `${f} does not read the settings`);
  }
  assert.match(read("src/lib/siteSettings.ts"), /public_site_settings/);
  assert.doesNotMatch(read("src/config/pricing.ts"), /export const PRICES_CONFIRMED/);
});

test("no public page prints a price by itself: they all use priceLabel()", () => {
  const files = [
    "src/components/insider/PartnerLanding.tsx",
    "src/components/insider/InsiderLanding.tsx",
    "src/components/creators/InsiderPage.tsx",
    "src/components/site/PricingPage.tsx",
    "src/components/apply/ApplyForm.tsx",
    "src/components/site/HomeLanding.tsx",
  ];
  for (const f of files) {
    const code = strip(read(f));
    assert.doesNotMatch(code, /AED\s*\{/, `${f} prints AED {...} by itself`);
    assert.doesNotMatch(code, /AED\s*\$\{/, `${f} prints AED \${...} by itself`);
    assert.doesNotMatch(code, /AED\s*[0-9]/, `${f} has a typed AED price`);
  }
  assert.match(read("src/components/insider/PartnerLanding.tsx"), /priceLabel\(/);
  assert.match(read("src/components/insider/InsiderLanding.tsx"), /priceLabel\(/);
});

test("the Partner page has two tiers (Restaurants and Shops) with a card for every plan", () => {
  const restaurants = PARTNER_PRICE_CARDS.filter((c) => c.group === "restaurants");
  const shops = PARTNER_PRICE_CARDS.filter((c) => c.group === "shops");
  assert.equal(restaurants.length, 5);
  assert.equal(shops.length, 3);
  for (const c of PARTNER_PRICE_CARDS) assert.ok(c.staffLogins === "unlimited" || c.staffLogins > 0, `${c.id} has staff logins`);
  const page = read("src/components/insider/PartnerLanding.tsx");
  assert.match(page, /<Tier n=\{1\} group="restaurants"/);
  assert.match(page, /<Tier n=\{2\} group="shops"/);
});

test("every plan card has a See more drop-down that opens on a tap (plain HTML, no animation needed)", () => {
  const page = read("src/components/insider/PartnerLanding.tsx");
  assert.match(page, /<details/);
  assert.match(page, /<summary/);
  assert.match(page, /t\.seeMore/);
  assert.match(read("src/content/en.ts"), /seeMore: "See more"/);
  assert.match(page, /min-h-11/); // a tap target of at least 44 pixels
});

test("the reward is the partner's choice: no fixed percentage limit is shown", () => {
  const page = read("src/components/insider/PartnerLanding.tsx");
  assert.match(page, /t\.rewardTitle/);
  assert.match(page, /t\.rewardLine/);
  assert.doesNotMatch(page, /REWARD_CAP/);
  const words = read("src/content/en.ts");
  assert.match(words, /percentage off, a freebie/);
  assert.doesNotMatch(words, /The most a reward can be/);
});

test("Careers is hidden: switched OFF, with no menu link, and the code is kept", () => {
  assert.equal(FEATURES.careersPage, false);
  assert.ok(existsSync("src/components/pages/CareersPage.tsx"), "the Careers code is never deleted");
  assert.match(read("src/app/careers/page.tsx"), /if \(!FEATURES\.careersPage\) notFound\(\)/);
  assert.match(read("src/components/TopBar.tsx"), /feature: "careersPage"/); // the menu link follows the switch
});

test("the new landing page uses the maroon, cream, Merriweather and Inter look", () => {
  assert.equal(FEATURES.newLanding, true);
  const home = read("src/components/site/HomeLanding.tsx");
  assert.match(home, /bg-maroon/);
  assert.match(home, /font-brand/); // Merriweather
  assert.match(home, /font-bar/); // Inter
  assert.match(home, /bg-pagebase/); // cream
  assert.match(read("src/components/site/HomePage.tsx"), /FEATURES\.newLanding \? <HomeLanding \/> : <OlderHomePage \/>/);
  assert.doesNotMatch(strip(home), /#[0-9a-fA-F]{3,8}\b/); // no colour codes outside colors.css
});

test("the new public files have no emoji and draw no people", () => {
  for (const f of ["src/components/site/HomeLanding.tsx", "src/components/insider/PartnerLanding.tsx"]) {
    assert.doesNotMatch(read(f), /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `${f} has an emoji`);
  }
});

test("Join buttons go to the dashboard's forms when its address is set, and to the Apply page before that", async () => {
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  const before = await import("../src/config/routes.ts?no-address");
  assert.equal(before.applyLink("partner"), "/apply?type=partner");
  assert.equal(before.joinLink("insider"), null);
  process.env.NEXT_PUBLIC_JOIN_URL = "https://dashboard.example.com/";
  const after = await import("../src/config/routes.ts?with-address");
  assert.equal(after.JOIN_URL, "https://dashboard.example.com"); // no slash at the end
  assert.equal(after.applyLink("partner"), "https://dashboard.example.com/#/join/partner");
  assert.equal(after.partnerLink("insider"), "https://dashboard.example.com/#/join/insider");
  assert.equal(after.partnerLink("restaurants"), "https://dashboard.example.com/#/join/partner");
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  assert.match(read(".env.example"), /NEXT_PUBLIC_JOIN_URL=/);
});
