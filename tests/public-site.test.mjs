// Tests for the new public site: pricing data, live counters, country list, the text file, the switches.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COUNTRY_CODES } from "../src/lib/countries.ts";
import { countryFromLanguage, parseTraceCountry, pickCounters } from "../src/lib/counters.ts";
// the older per-country counters (kept for when more countries open) are tested with their own numbers
const COUNTER_MINIMUMS = { people: 100, saves: 500, partners: 10, insiders: 10 };
const COUNTER_ORDER = ["people", "saves", "partners", "insiders"];
import { FREE_MONTHS, INSIDER_PLAN, RESTAURANT_PLANS, SHOP_PLANS, YEARLY_MONTHS_FREE, yearlyPriceAed } from "../src/config/pricing.ts";

const text = (f) => readFileSync(f, "utf8");

// ---- pricing: exactly what was agreed ----
test("restaurant plans and prices", () => {
  const byId = Object.fromEntries(RESTAURANT_PLANS.map((p) => [p.id, p]));
  assert.deepEqual(RESTAURANT_PLANS.map((p) => p.name), ["Starter", "Grow", "Main", "Premium", "Multi-branch", "Hotels"]);
  assert.equal(byId.starter.priceAed, 99);
  assert.equal(byId.grow.priceAed, 149);
  assert.equal(byId.main.priceAed, 199);
  assert.equal(byId.premium.priceAed, 249);
  assert.equal(byId["multi-branch"].priceAed, 349);
  assert.equal(byId.hotels.priceAed, null); // custom
  assert.match(byId.starter.forWho, /afeteria/);
  assert.match(byId.grow.forWho, /afes/);
  assert.match(byId.grow.forWho, /bakeries/);
});

test("shop plans and prices", () => {
  assert.deepEqual(SHOP_PLANS.map((p) => [p.name, p.priceAed]), [["Starter", 99], ["Plus", 199], ["Pro", 299]]);
});

test("Spotted Insider is AED 249 a month", () => {
  assert.equal(INSIDER_PLAN.name, "Spotted Insider");
  assert.equal(INSIDER_PLAN.priceAed, 249);
});

test("staff logins: restaurants 7, 10, 15, unlimited, unlimited; shops 7, 10, unlimited", () => {
  assert.deepEqual(RESTAURANT_PLANS.slice(0, 5).map((p) => p.staffLogins), [7, 10, 15, "unlimited", "unlimited"]);
  assert.deepEqual(SHOP_PLANS.map((p) => p.staffLogins), [7, 10, "unlimited"]);
});

test("first 2 months free; paying yearly gives 1 month free", () => {
  assert.equal(FREE_MONTHS, 2);
  assert.equal(YEARLY_MONTHS_FREE, 1);
  assert.equal(yearlyPriceAed(99), 99 * 11);
  assert.equal(yearlyPriceAed(249), 249 * 11);
});

// ---- live counters ----
const rows = [
  { metric: "people", country: "ALL", value: 5000 },
  { metric: "people", country: "AE", value: 80 },
  { metric: "saves", country: "ALL", value: "20000" },
  { metric: "saves", country: "AE", value: 900 },
  { metric: "partners", country: "ALL", value: 12 },
  { metric: "partners", country: "AE", value: 3 },
  { metric: "insiders", country: "ALL", value: 4 },
];

test("a counter shows only once it passes the number in the config file", () => {
  const shown = pickCounters(rows, "AE", COUNTER_MINIMUMS, COUNTER_ORDER);
  const by = Object.fromEntries(shown.map((s) => [s.metric, s]));
  assert.equal(by.people.world, 5000);
  assert.equal(by.people.country, undefined); // 80 is under the minimum
  assert.equal(by.saves.country, 900);
  assert.equal(by.saves.world, 20000);
  assert.equal(by.partners.world, 12);
  assert.equal(by.partners.country, undefined);
  assert.equal(by.insiders, undefined); // 4 is under the minimum, nothing to show
});

test("with no country chosen only the worldwide numbers can show; nothing big enough means nothing shown", () => {
  const worldOnly = pickCounters(rows, null, COUNTER_MINIMUMS, COUNTER_ORDER);
  assert.ok(worldOnly.every((s) => s.country === undefined));
  assert.deepEqual(pickCounters([], "AE", COUNTER_MINIMUMS, COUNTER_ORDER), []);
});

test("the minimums can be changed in the config file (they are simple numbers)", () => {
  const strict = pickCounters(rows, "AE", { people: 1e9, saves: 1e9, partners: 1e9, insiders: 1e9 }, COUNTER_ORDER);
  assert.deepEqual(strict, []);
  const loose = pickCounters(rows, "AE", { people: 0, saves: 0, partners: 0, insiders: 0 }, COUNTER_ORDER);
  assert.equal(loose.length, 4);
});

test("the country is read from Cloudflare's trace, and from the browser language as a backup", () => {
  assert.equal(parseTraceCountry("fl=1\nloc=AE\ntls=TLSv1.3\n"), "AE");
  assert.equal(parseTraceCountry("loc=XX\n"), null);
  assert.equal(parseTraceCountry("loc=T1\n"), null);
  assert.equal(parseTraceCountry("nothing here"), null);
  assert.equal(countryFromLanguage("en-AE"), "AE");
  assert.equal(countryFromLanguage("ar_SA"), "SA");
  assert.equal(countryFromLanguage("en"), null);
});

test("every country code in the picker is a real country name", () => {
  assert.ok(COUNTRY_CODES.length > 240);
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length);
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  for (const c of COUNTRY_CODES) assert.notEqual(names.of(c), c, `${c} has no name`);
  assert.ok(COUNTRY_CODES.includes("AE"));
});

// ---- the text file and the switches ----
test("the menu words are in the one text file, in the agreed order", () => {
  const nav = text("src/components/TopBar.tsx");
  // (the new draft top bar: Home, Insiders, Partners, Careers, then Admin and Log in; see tests/login-route.test.mjs)
  const order = ["n.home", "n.insiders", "n.partners", "n.careers"];
  let at = -1;
  for (const k of order) {
    const i = nav.indexOf(`label: ${k}`);
    assert.ok(i > at, `${k} is missing or out of order in the top menu`);
    at = i;
  }
  assert.match(nav, /LOG_IN[\s\S]*n\.logIn/);
  const en = text("src/content/en.ts");
  for (const w of ["Home", "Restaurants", "Shops", "Insiders", "Pricing", "How to join", "FAQ", "About", "Sign in", "Partners", "Careers", "Admin", "Log in"]) assert.ok(en.includes(`"${w}"`), `${w} missing from the text file`);
});

test("the home page and partner pages take their words from the text file (no long sentences inside the page code)", () => {
  for (const f of ["src/components/site/HomePage.tsx", "src/components/site/PartnerPage.tsx", "src/components/site/PricingPage.tsx", "src/app/faq/page.tsx", "src/app/how-to-join/page.tsx"]) {
    const s = text(f).replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(s, />\s*[A-Z][a-z]+(?: [a-z]+){5,}[.!?]?\s*</, `${f} has a long sentence inside the code: move it to src/content/en.ts`);
  }
});

test("the switches are set as agreed: cloth banner and lamp OFF, careers ON (draft look), store buttons OFF", () => {
  const f = text("src/config/features.ts");
  assert.match(f, /hero: false/);
  assert.match(f, /themeLamp: false/);
  assert.match(f, /careersPage: true/);
  assert.match(f, /storeButtons: false/);
  assert.match(f, /liveCounters: true/);
  // the code for the hidden parts is still there
  for (const keep of ["src/components/hero/Hero.tsx", "src/components/hero/banner3d.ts", "src/components/ThemeLamp.tsx", "src/components/pages/CareersPage.tsx", "src/components/Story.tsx"]) {
    assert.ok(text(keep).length > 200, `${keep} should still exist`);
  }
});

test("the store buttons need both the switch and a link", () => {
  const s = text("src/components/site/StoreButtons.tsx");
  assert.match(s, /FEATURES\.storeButtons/);
  assert.match(s, /filter\(\(\[, href\]\) => href\)/);
});

test("no sign-up on the partner pages: the form only saves a contact request", () => {
  const s = text("src/components/site/ContactForm.tsx");
  assert.match(s, /from\("contact_requests"\)\.insert/);
  assert.doesNotMatch(s, /signInWithOtp|signUp/);
});
