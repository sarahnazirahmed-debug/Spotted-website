// Stage 2: the home page. Who is Spotted for (3 cards), How Spotted helps (6 alternating cards), distances, no Join section.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { en } from "../src/content/en.ts";
import { FEATURES } from "../src/config/features.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const home = code("src/components/site/HomeLanding.tsx");
const h = en.home;

test("'Who is Spotted for?' has three cards: Users, Partners, Insiders", () => {
  assert.equal(h.audienceTitle, "Who is Spotted for?");
  assert.deepEqual([h.usersCard.title, h.partnersCard.title, h.insidersCard.title], ["Users", "Partners", "Insiders"]);
  assert.match(home, /\.\.\.h\.usersCard, on: true/);
  assert.match(home, /\.\.\.h\.partnersCard, on: FEATURES\.businessPages/);
  assert.match(home, /\.\.\.h\.insidersCard, on: FEATURES\.insiderPage/);
});

test("the Users card glides down to How Spotted helps", () => {
  assert.equal(h.usersCard.href, "#how-it-works");
  assert.match(home, /<Section id="how-it-works" title=\{h\.helpsTitle\}>/); // the place it goes to
  // the Users card is a link; it comes BEFORE How Spotted helps, so the scroll goes down the page
  assert.ok(home.indexOf("h.audienceTitle") < home.indexOf("h.helpsTitle"));
  assert.match(home, /<a key=\{x\.title\} href=\{x\.href\}/);
  // smooth scrolling is switched on ONLY when the visitor has not asked for Reduce Motion
  const css = read("src/app/globals.css");
  const smooth = [...css.matchAll(/scroll-behavior:\s*smooth/g)];
  assert.equal(smooth.length, 1);
  const open = css.lastIndexOf("@media (prefers-reduced-motion: no-preference) {", smooth[0].index);
  const close = css.indexOf("\n}\n", open);
  assert.ok(open !== -1 && smooth[0].index > open && smooth[0].index < close, "inside the no-preference block");
  // and the target is not hidden behind the fixed top bar
  assert.match(read("src/components/insider/ProfileLanding.tsx"), /scroll-mt-16/);
});

test("a card whose page is switched OFF shows Coming soon and is not a link", () => {
  assert.equal(typeof FEATURES.businessPages, "boolean"); // the cards follow these two switches in features.ts
  assert.equal(typeof FEATURES.insiderPage, "boolean");
  assert.match(home, /x\.on \? text\.common\.learnMore : text\.common\.comingSoon/);
  assert.match(home, /x\.on \? \(\s*<a /); // only a card that is ON is a link
});

test("How Spotted helps has six cards, one left, one right, and so on", () => {
  assert.equal(h.helps.length, 6);
  for (const x of h.helps) assert.ok(x.title.length > 3 && x.text.length > 10 && x.text.length < 140, x.title); // short and plain
  assert.match(home, /i % 2 === 0 \? "md:justify-self-start" : "md:justify-self-end"/);
  assert.match(home, /md:w-\[calc\(50%-1\.25rem\)\]/); // each card takes one half, so they zig-zag
  assert.match(home, /<ol /);
  assert.doesNotMatch(home, /md:grid-cols-3[^"]*">\s*\{h\.helps/); // no longer three in a row
});

test("the reminder distances are 1, 5, 10 and 15 km", () => {
  const all = JSON.stringify(en.home);
  assert.match(all, /1, 5, 10 or 15 km/);
  assert.doesNotMatch(all, /200 m|300 m|500 m|1 km\b/);
});

test("the Join section at the bottom is gone", () => {
  assert.doesNotMatch(home, /id="join"/);
  assert.doesNotMatch(home, /h\.joinTitle|h\.joinLead/);
  assert.equal("joinTitle" in h, false);
  assert.equal("joinLead" in h, false);
  // the order: hero, who is it for, how it helps, (numbers), talk to us
  const at = (t) => home.indexOf(t);
  assert.ok(at("<header") < at("h.audienceTitle") && at("h.audienceTitle") < at("h.helpsTitle") && at("h.helpsTitle") < at("<LiveCounters") && at("<LiveCounters") < at("h.talkTitle"));
});

test("the six pictures exist, are objects (no faces), and the page uses no colour codes or emoji", () => {
  const icons = read("src/components/site/Icons.tsx");
  for (const n of ["arrow", "check", "bookmark", "bell", "range", "globe"]) assert.match(icons, new RegExp(`case "${n}":`), n);
  assert.match(home, /\["arrow", "check", "bookmark", "bell", "range", "globe"\]/);
  assert.doesNotMatch(icons.slice(icons.indexOf('case "check"'), icons.indexOf('case "sun"')), /circle|ellipse/); // nothing that could look like an eye
  assert.doesNotMatch(home, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(read("src/content/en.ts").slice(read("src/content/en.ts").indexOf("  home: {"), read("src/content/en.ts").indexOf("  counters: {")), /\p{Extended_Pictographic}/u);
});

test("the new words are marked as a draft for Sarah to approve", () => {
  assert.match(read("src/content/en.ts"), /DRAFT WORDING: to be approved by Sarah/);
});
