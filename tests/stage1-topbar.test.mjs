// Stage 1: top bar and menu.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { en } from "../src/content/en.ts";
import { FEATURES } from "../src/config/features.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const bar = code("src/components/TopBar.tsx");

test("the menu is How it works, FAQs, Insiders, Partners, in that order; Log in and Sign up on the right", () => {
  const links = bar.slice(bar.indexOf("const LINKS"), bar.indexOf("];", bar.indexOf("const LINKS")));
  assert.deepEqual([...links.matchAll(/label: n\.(\w+)/g)].map((m) => m[1]), ["howItWorks", "faqs", "insiders", "partners"]);
  assert.deepEqual([en.nav.howItWorks, en.nav.faqs, en.nav.insiders, en.nav.partners], ["How it works", "FAQs", "Insiders", "Partners"]);
  assert.deepEqual([en.nav.logIn, en.nav.signUp], ["Log in", "Sign up"]);
  // the order in the page: logo, then the links, then the buttons
  const at = (t) => bar.indexOf(t);
  assert.ok(at('aria-label="Spotted, home"') < at('aria-label="Main"') && at('aria-label="Main"') < at("authButton(LOG_IN") && at("authButton(LOG_IN") < at("authButton(SIGN_UP"));
});

test("the links are in the middle of the bar, with the logo on the left and the buttons on the right", () => {
  assert.match(bar, /lg:grid lg:grid-cols-\[1fr_auto_1fr\]/); // three columns: the middle one is exactly centred
  assert.match(bar, /lg:justify-self-start/); // logo
  assert.match(bar, /lg:justify-self-center/); // menu
  assert.match(bar, /lg:justify-self-end/); // buttons
});

test("the bar changes at 1024px (lg), not 1280px (xl): three bars below, the full menu above", () => {
  assert.doesNotMatch(bar, /\bxl:/);
  assert.match(bar, /hidden items-center gap-0\.5 lg:flex/); // the links
  assert.match(bar, /hidden items-center gap-2 lg:flex/); // the two buttons
  assert.match(bar, /size-11[^"]*lg:hidden/); // the three-bar button disappears from 1024px up
  assert.match(bar, /shadow-xl lg:hidden/); // and so does its panel
  assert.match(bar, /M4 7h16M4 12h16M4 17h16/); // three bars
});

test("the page you are on is marked, for pages and for the How it works part of the home page", () => {
  assert.match(bar, /aria-current=\{isCurrent\(l\) \? "page" : undefined\}/);
  assert.match(bar, /underline decoration-coral/);
  assert.match(bar, /pathname === "\/" && hash === item\.href\.slice\(1\)/);
  assert.match(bar, /useSyncExternalStore/);
});

test("every link and button has the press animation and a clear focus ring, and it respects Reduce Motion", () => {
  const press = "transition motion-safe:active:scale-95";
  assert.ok(bar.split(press).length - 1 >= 3, "logo, links and menu items, and both buttons"); // logo + links (base) + buttons (auth)
  assert.doesNotMatch(bar, /(?<!motion-safe:)active:scale-95/); // never without motion-safe
  assert.ok(bar.split("focus-visible:outline").length - 1 >= 5);
});

test("the old menu words are gone: Your data, Spotted Crew, Join Spotted, Get notified; Questions is FAQs", () => {
  for (const f of ["src/components/TopBar.tsx", "src/components/Footer.tsx"]) assert.doesNotMatch(read(f), /your data|spotted crew|join spotted|get notified/i, f);
  const nav = en.nav;
  assert.doesNotMatch(JSON.stringify(nav), /Your data|Spotted Crew|Join Spotted|Get notified|Questions/);
  assert.doesNotMatch(JSON.stringify(en.footer), /Your data|Spotted Crew|Join Spotted|Get notified/);
  assert.equal(nav.faqs, "FAQs");
});

test("Careers follows its switch: hidden while OFF", () => {
  assert.equal(FEATURES.careersPage, false);
  assert.match(bar, /FEATURES\.careersPage \? \[\.\.\.LINKS, CAREERS\] : LINKS/);
  assert.match(bar, /feature: "careersPage"/);
  assert.doesNotMatch(code("src/components/Footer.tsx"), /careers/i);
});

test("WhatsApp: only the small round corner logo, no other WhatsApp button", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const all = walk("src").filter((f) => /\.tsx$/.test(f) && !f.startsWith("src/components/admin"));
  // the WhatsApp green is used by the corner button only (ContactCta is an old, unused file)
  const green = all.filter((f) => /bg-whatsapp/.test(code(f)));
  assert.deepEqual(green.sort(), ["src/components/ContactCta.tsx", "src/components/WhatsApp.tsx"]);
  assert.ok(!all.some((f) => /import ContactCta|from "[^"]*ContactCta"/.test(code(f))), "ContactCta must not be used");
  assert.match(code("src/components/WhatsApp.tsx"), /wa\.me/); // the corner button stays
  assert.match(code("src/components/SiteChrome.tsx"), /FEATURES\.whatsappButton && <WhatsApp \/>/);
  for (const f of ["src/components/pages/AboutPage.tsx", "src/components/site/SocialButtons.tsx", "src/app/contact/page.tsx", "src/components/Footer.tsx"]) assert.doesNotMatch(code(f), /wa\.me|bg-whatsapp|Chat on WhatsApp/, f);
});
