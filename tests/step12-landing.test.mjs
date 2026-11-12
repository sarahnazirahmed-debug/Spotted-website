// Step 12: plum and coral colours, switches, the UAE counter bar, landing words, footer, and no launch dates.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pickBar } from "../src/lib/counters.ts";
import { COUNTER_COUNTRY, COUNTER_LATER, COUNTER_MINIMUMS, COUNTER_REQUIRED } from "../src/config/counters.ts";
import { FEATURES } from "../src/config/features.ts";
import { en } from "../src/content/en.ts";
import { partnerLink } from "../src/config/routes.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");

// ---------------------------------------------------------------- colours (replaced in Stage 4: maroon and coral, no purple)
test("the maroon and coral colours are in colors.css, and only there", () => {
  const css = read("src/styles/colors.css");
  const want = { "--brand-maroon": "#5c0f24", "--rose": "#d6598f", "--rose-line": "#e8a9b6", "--blush": "#f4d7d4", "--soft-pink": "#fdeff1", "--coral": "#ff6b6b" };
  for (const [name, hex] of Object.entries(want)) assert.match(css, new RegExp(`${name}:\\s*${hex}\\b`, "i"), name);
  assert.match(css, /--ember:\s*var\(--coral\)/);
  assert.match(css, /--paper:\s*var\(--blush\)/);
  // no other file holds those colour codes
  const hexes = Object.values(want).map((h) => h.slice(1));
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk("src").filter((x) => /\.(ts|tsx|css)$/.test(x) && !x.endsWith("colors.css"))) {
    for (const h of hexes) assert.ok(!read(f).toLowerCase().includes(`#${h}`), `${f} holds #${h}`);
  }
});

// ---------------------------------------------------------------- switches
test("insider page and business pages are ON in the draft look (the new switches); waitlists and store buttons stay OFF", () => {
  assert.equal(FEATURES.insiderPage, true);
  assert.equal(FEATURES.businessPages, true);
  for (const k of ["waitlist", "businessWaitlist", "insiderWaitlist", "storeButtons"]) assert.equal(FEATURES[k], false, k);
});

test("the links to those pages follow their switches (ON: the page, OFF: the Contact page)", () => {
  assert.equal(partnerLink("restaurants"), FEATURES.applyPage ? "/apply?type=partner" : FEATURES.businessPages ? "/partners#get-in-touch" : "/contact");
  assert.equal(partnerLink("shops"), FEATURES.applyPage ? "/apply?type=partner" : FEATURES.businessPages ? "/partners#get-in-touch" : "/contact");
  assert.equal(partnerLink("insider"), FEATURES.applyPage ? "/apply?type=insider" : FEATURES.insiderPage ? "/insider#get-in-touch" : "/contact");
  for (const f of ["src/app/how-to-join/page.tsx", "src/components/site/PricingPage.tsx"]) {
    assert.doesNotMatch(read(f), /href="\/(restaurants|shops|insider)/, f);
    assert.match(read(f), /partnerLink\(/, f);
  }
  const home = read("src/components/site/HomePage.tsx");
  assert.match(home, /FEATURES\.insiderPage/);
  assert.match(home, /FEATURES\.businessPages/);
  for (const f of ["src/app/restaurants/page.tsx", "src/app/shops/page.tsx"]) assert.match(read(f), /!FEATURES\.businessPages\) notFound\(\)/, f);
  assert.match(read("src/app/insider/page.tsx"), /!FEATURES\.insiderPage\) notFound\(\)/);
});

// ---------------------------------------------------------------- counter bar
const rows = (o) => Object.entries(o).map(([metric, value]) => ({ metric, country: "AE", value }));
const bar = (o) => pickBar(rows(o), COUNTER_COUNTRY, COUNTER_MINIMUMS, COUNTER_REQUIRED, COUNTER_LATER);

test("the counter bar is for the UAE and needs accounts, saved places and saved reels EACH above 500", () => {
  assert.equal(COUNTER_COUNTRY, "AE");
  assert.deepEqual(COUNTER_REQUIRED, ["people", "saved_places", "saved_reels"]);
  assert.equal(COUNTER_MINIMUMS.people, 500);
  assert.equal(COUNTER_MINIMUMS.saved_places, 500);
  assert.equal(COUNTER_MINIMUMS.saved_reels, 500);
  assert.deepEqual(bar({ people: 900, saved_places: 900, saved_reels: 900 }).map((t) => t.metric), ["people", "saved_places", "saved_reels"]);
  // exactly 500 is not above 500
  assert.deepEqual(bar({ people: 500, saved_places: 900, saved_reels: 900 }), []);
  // one missing, or one too low: no bar at all
  assert.deepEqual(bar({ people: 9000, saved_places: 9000 }), []);
  assert.deepEqual(bar({ people: 9000, saved_places: 9000, saved_reels: 499 }), []);
  assert.deepEqual(bar({}), []);
});

test("only the UAE numbers count; worldwide and other countries do not", () => {
  const r = [
    { metric: "people", country: "ALL", value: 99999 }, { metric: "saved_places", country: "ALL", value: 99999 }, { metric: "saved_reels", country: "ALL", value: 99999 },
    { metric: "people", country: "SA", value: 99999 }, { metric: "saved_places", country: "SA", value: 99999 }, { metric: "saved_reels", country: "SA", value: 99999 },
  ];
  assert.deepEqual(pickBar(r, "AE", COUNTER_MINIMUMS, COUNTER_REQUIRED, COUNTER_LATER), []);
});

test("partners and insiders tiles come later, each at its own 100", () => {
  assert.equal(COUNTER_MINIMUMS.partners, 100);
  assert.equal(COUNTER_MINIMUMS.insiders, 100);
  const base = { people: 900, saved_places: 900, saved_reels: 900 };
  assert.deepEqual(bar({ ...base, partners: 100, insiders: 50 }).map((t) => t.metric), ["people", "saved_places", "saved_reels"]); // 100 is not above 100
  assert.deepEqual(bar({ ...base, partners: 101, insiders: 50 }).map((t) => t.metric), [...COUNTER_REQUIRED, "partners"]);
  assert.deepEqual(bar({ ...base, partners: 150, insiders: 120 }).map((t) => t.metric), [...COUNTER_REQUIRED, "partners", "insiders"]);
  assert.deepEqual(bar({ partners: 500, insiders: 500 }), []); // later tiles never show without the bar
});

test("saves are split into saved places and saved reels on screen", () => {
  assert.equal(en.counters.labels.saved_places, "Saved places");
  assert.equal(en.counters.labels.saved_reels, "Saved reels");
  assert.ok(!("saves" in en.counters.labels));
  const c = read("src/components/site/LiveCounters.tsx");
  assert.match(c, /pickBar\(/);
  assert.doesNotMatch(c, /worldwide|pickerLabel/); // UAE only: no world numbers, no country picker
});

test("database: the two new counters can be stored and are returned as totals only", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "main@example.com"), email: "main@example.com" };
  await db.exec("insert into public.team_members (email, name, role) values ('main@example.com','Main','main_admin')");
  const ok = await attempt(db, who, "insert into public.stats_counters (metric, country, value) values ('saved_places','AE',700), ('saved_reels','AE',650), ('saved_places','SA',10)");
  assert.ok(ok.ok, ok.error);
  assert.equal((await attempt(db, who, "insert into public.stats_counters (metric, country, value) values ('pizza','AE',1)")).ok, false);
  await db.exec("insert into public.stats_counters (metric, country, value) values ('saved_places','AE',700), ('saved_reels','AE',650), ('saved_places','SA',10)");
  const r = await attempt(db, null, "select * from public.public_stats()"); // anyone, even logged out
  assert.ok(r.ok, r.error);
  const get = (m, c) => Number(r.rows.find((x) => x.metric === m && x.country === c)?.value ?? -1);
  assert.equal(get("saved_places", "AE"), 700);
  assert.equal(get("saved_reels", "AE"), 650);
  assert.equal(get("saved_places", "ALL"), 710);
  assert.deepEqual(Object.keys(r.rows[0]).sort(), ["country", "metric", "value"]);
});

// ---------------------------------------------------------------- landing words, buttons, footer
test("landing headline and line are exactly as asked", () => {
  assert.equal(en.home.title, "Saw it in a reel?\nSpotted remembers it.");
  assert.equal(en.home.lead, "Save it once, get a nudge when you're nearby. Coming soon.");
  assert.match(read("src/components/pages/PageHeader.tsx"), /whitespace-pre-line/); // the headline breaks after the question
});

test("the landing header has the Instagram button, and the only WhatsApp button is the small round one in the corner", () => {
  const home = read("src/components/site/HomePage.tsx");
  const header = home.slice(home.indexOf("headerExtra"), home.indexOf("<Section"));
  assert.match(header, /<SocialButtons/);
  const social = read("src/components/site/SocialButtons.tsx");
  assert.doesNotMatch(social.replace(/^\s*\/\/.*$/gm, ""), /whatsapp|wa\.me/i); // no big WhatsApp button (comments do not count)
  assert.match(read("src/components/WhatsApp.tsx"), /wa\.me|whatsapp/i); // the small round one stays
  for (const f of ["src/components/Footer.tsx", "src/components/site/PartnerPage.tsx", "src/components/business/BusinessPage.tsx", "src/components/WhatsSpotted.tsx"]) assert.doesNotMatch(read(f), /ContactCta/, `${f} still has a big WhatsApp button`);
  assert.doesNotMatch(read("src/components/WhatsSpotted.tsx"), /Notify me|Waitlist/); // the Notify me section is gone
  assert.match(social, /name="instagram"/); // Instagram is our own simple round camera icon (you asked for it in Step 8)
  assert.match(social, /aria-label="Spotted on Instagram"/);
  assert.doesNotMatch(social, /<svg/); // the drawing lives in Icons.tsx, not pasted brand artwork
});

test("the footer has About us, Contact, Terms, Privacy policy and Confidentiality agreement, and the Contact page exists", () => {
  const f = read("src/components/Footer.tsx");
  const links = [...f.matchAll(/\[text\.(?:footer|nav)\.(\w+), "(\/[\w-]*)", FEATURES\.(\w+)\]/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(links, [["about", "/about"], ["contact", "/contact"], ["terms", "/terms"], ["privacyPolicy", "/privacy"], ["confidentiality", "/confidentiality"]]);
  assert.equal(en.footer.contact, "Contact");
  assert.ok(existsSync("src/app/contact/page.tsx"));
  assert.equal(FEATURES.contactPage, true);
  assert.match(read("src/app/contact/page.tsx"), /SocialButtons/);
});

// ---------------------------------------------------------------- no launch dates anywhere
test("no launch date anywhere on the site: no months with a day or year, no 2027 or later, no 'launches on'", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
  const patterns = [
    new RegExp(`\\b${MONTH}\\.? \\d{1,2}\\b`, "i"),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)? (?:of )?${MONTH}\\b`, "i"),
    new RegExp(`\\b${MONTH}\\.? (?:20)\\d\\d\\b`, "i"),
    /(?<![\d.])20(?:2[7-9]|[3-9]\d)(?![\d.])/, // a year (not part of a map number such as 25.2048)
    /\blaunch(?:es|ing|ed)? (?:on|in|by|at|from)\b/i,
    /\b(?:q[1-4]) 20\d\d\b/i,
    /\b\d{1,2}[./]\d{1,2}[./]20\d\d\b/,
  ];
  // public site only: the team's admin screens and tests are not the website's words
  const files = [...walk("src"), "public/_redirects"].filter((f) => /\.(ts|tsx|css|md|txt|_redirects)$/.test(f) || f.endsWith("_redirects")).filter((f) => !f.startsWith("src/components/admin") && !f.startsWith("src/lib/dashboard") && !f.startsWith("src/app/admin"));
  const bad = [];
  for (const f of files) {
    // the privacy and terms pages say when they were last updated: that is not a launch date
    const s = strip(read(f)).replace(/^.*lastUpdated.*$/gm, "");
    for (const re of patterns) {
      const m = s.match(re);
      if (m) bad.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, []);
  // and the legal pages' "last updated" is a plain updated-on date, not a launch date
  assert.doesNotMatch(read("src/config/features.ts").replace(/^\s*\/\/.*$/gm, ""), /launch[^\n]*\b20\d\d\b/i);
});
