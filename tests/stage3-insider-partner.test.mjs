// Stage 3: the Insider page and the Partner page have a tidy top section: just the title, the intro and the phone picture.
// No small label above the title (such as "For influencers") and no buttons in the top section.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { en } from "../src/content/en.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("both pages are built from the SAME template, so one tidy-up covers both", () => {
  for (const f of ["src/components/insider/InsiderLanding.tsx", "src/components/insider/PartnerLanding.tsx"]) assert.match(code(f), /<ProfileLanding /, f);
});

test("the top section of the template has the title, the intro and the phone, and nothing else", () => {
  const t = code("src/components/insider/ProfileLanding.tsx");
  const top = t.slice(t.indexOf("<header"), t.indexOf("</header>"));
  assert.match(top, /<h1[^>]*>\{t\.hero\.title\}<\/h1>/);
  assert.match(top, /t\.hero\.lead/);
  assert.match(top, /<PhoneLoop \/>/);
  assert.doesNotMatch(top, /<Link|<a |<button|coralButton|t\.hero\.label|t\.hero\.account|t\.hero\.apply/); // no buttons, no label
  // the h1 is the first thing in the text column: nothing sits above it
  const column = top.slice(top.indexOf("<div>"), top.indexOf("<h1"));
  assert.doesNotMatch(column, /<span|<p /);
});

test("the old labels and the 'I already have an account' button are gone from the words", () => {
  for (const page of [en.insiderPage, en.partnerPage]) {
    assert.deepEqual(Object.keys(page.hero).sort(), ["apply", "lead", "title"]);
  }
  const all = JSON.stringify(en);
  assert.doesNotMatch(all, /For influencers|For restaurants and shops|I already have an account/);
});

test("each page keeps exactly one apply button, at the bottom in the closing band", () => {
  const t = code("src/components/insider/ProfileLanding.tsx");
  assert.equal((t.match(/t\.hero\.apply/g) ?? []).length, 1);
  assert.ok(t.indexOf("t.hero.apply") > t.indexOf('id="get-in-touch"'));
  assert.equal(en.insiderPage.hero.apply, "Become an Insider");
  assert.equal(en.partnerPage.hero.apply, "Become a Partner");
});
