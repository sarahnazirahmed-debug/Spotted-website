// Stage 5: About us, Contact and FAQs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CONTACT_DETAILS } from "../src/config/contactDetails.ts";
import { CONTACT, FEATURES } from "../src/config/features.ts";
import { en } from "../src/content/en.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("the three page switches already exist and are ON", () => {
  assert.equal(FEATURES.aboutPage, true);
  assert.equal(FEATURES.contactPage, true);
  assert.equal(FEATURES.faqPage, true);
  assert.match(code("src/app/faq/page.tsx"), /!FEATURES\.faqPage\) notFound\(\)/);
  assert.match(code("src/app/contact/page.tsx"), /!FEATURES\.contactPage\) notFound\(\)/);
  assert.match(code("src/app/about/page.tsx"), /!FEATURES\.aboutPage\) notFound\(\)/);
});

test("the contact details (complaints email, inquiry email, phone) live in ONE file, as placeholders", () => {
  assert.deepEqual(Object.keys(CONTACT_DETAILS).sort(), ["complaintsEmail", "inquiryEmail", "phone"]);
  for (const d of Object.values(CONTACT_DETAILS)) {
    assert.equal(typeof d.value, "string");
    assert.equal(d.live, false); // placeholders until Sarah types the real ones
  }
  // made-up addresses on a domain nobody owns
  assert.match(CONTACT_DETAILS.complaintsEmail.value, /@example\.com$/);
  assert.match(CONTACT_DETAILS.inquiryEmail.value, /@example\.com$/);
  // the older CONTACT setting is fed from that same file (one place to change)
  assert.equal(CONTACT.email, CONTACT_DETAILS.inquiryEmail.value);
  assert.equal(CONTACT.emailLive, CONTACT_DETAILS.inquiryEmail.live);
  // the pages that SHOW contact details hold none of their own typed in (form hints like "+971 50 000 0000" are not contact details)
  for (const f of ["src/components/pages/AboutPage.tsx", "src/app/contact/page.tsx", "src/components/site/ContactDetails.tsx", "src/components/Footer.tsx", "src/components/pages/LegalPages.tsx"]) {
    const c = code(f);
    assert.doesNotMatch(c, /["'`][\w.+-]+@[\w-]+\.[a-z.]+["'`]/i, `${f} has an email typed in`);
    assert.doesNotMatch(c, /\+971[\s\d-]{6,}/, `${f} has a phone number typed in`);
  }
});

test("a placeholder shows as plain text with a Placeholder tag and is NOT a link; a live one becomes a link", () => {
  const c = code("src/components/site/ContactDetails.tsx");
  assert.match(c, /detail\.live \? \(\s*<a href=\{href\}/);
  assert.match(c, /!detail\.live && <span[^>]*>\{t\.placeholder\}/);
  assert.match(c, /mailto:\$\{d\.complaintsEmail\.value\}/);
  assert.match(c, /tel:/);
  assert.equal(en.contact.placeholder, "Placeholder");
});

test("About us and Contact both show the three details, from the same component", () => {
  assert.match(code("src/components/pages/AboutPage.tsx"), /<ContactDetails \/>/);
  assert.match(code("src/app/contact/page.tsx"), /<ContactDetails \/>/);
  assert.equal(en.about.chip, "About us");
  assert.equal(en.nav.about, "About us");
  assert.deepEqual([en.contact.inquiry, en.contact.complaints, en.contact.phone], ["Questions and enquiries", "Complaints", "Phone"]);
  // WhatsApp is only the round corner button
  for (const f of ["src/components/pages/AboutPage.tsx", "src/app/contact/page.tsx", "src/components/site/ContactDetails.tsx"]) assert.doesNotMatch(code(f), /wa\.me|bg-whatsapp/, f);
});

test("the three pages use the new look and take their words from the text file", () => {
  for (const f of ["src/components/pages/AboutPage.tsx", "src/app/contact/page.tsx", "src/app/faq/page.tsx"]) {
    assert.match(code(f), /<DraftPage /, f);
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(code(f), />\s*[A-Z][a-z]+(?: [a-z]+){5,}[.!?]?\s*</, `${f}: long sentences belong in src/content/en.ts`);
  }
});

// ---------------------------------------------------------------- FAQs
const faq = code("src/components/site/FaqList.tsx");

test("FAQs: a list on the left with thin lines, and NO question selected at first", () => {
  assert.match(faq, /useState<number \| null>\(null\)/); // nothing selected
  assert.match(faq, /border-t border-rosesoft/); // thin line at the top ...
  assert.match(faq, /<li key=\{it\.q\} className="border-b border-rosesoft">/); // ... and under each question
  assert.match(faq, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.15fr\)\]/); // list on the left, answer on the right
  assert.equal(en.faq.pick, "Choose a question on the left."); // the right side says what to do at first
});

test("FAQs: hover gives a soft button look; clicking underlines the question and shows its answer on the right", () => {
  assert.match(faq, /hover:bg-pinktint/);
  assert.match(faq, /rounded-xl/);
  assert.match(faq, /on \? "underline decoration-coral/); // the chosen question is underlined
  assert.match(faq, /onClick=\{\(\) => toggle\(i\)\}/);
  assert.match(faq, /aria-expanded=\{on\}/);
  assert.match(faq, /aria-controls=\{`faq-a-\$\{i\}`\}/);
  assert.match(faq, /className="faq-side /); // the answer on the right slides in
  assert.match(faq, /key=\{open\}/); // a new question replays the slide
});

test("FAQs: on small screens the answer opens under its question (the right-hand side is hidden)", () => {
  assert.match(faq, /className="hidden md:block"/); // the right-hand side exists only from md up
  assert.match(faq, /faq-under[^"]*md:hidden/); // the under-the-question answer exists only below md
  assert.match(faq, /\{on && \(\s*<div id=\{`faq-a-\$\{i\}`\}/);
});

test("FAQs: the slide has a Reduce Motion fallback (the answer just appears), and it works with the keyboard", () => {
  const css = read("src/app/globals.css");
  const at = css.indexOf("@keyframes faq-slide-in");
  assert.ok(at > 0);
  const rule = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference) {", at), css.indexOf("}\n}", at) + 3);
  assert.match(rule, /\.faq-side \{ animation: faq-slide-in/);
  assert.match(rule, /\.faq-under \{ animation: faq-drop-in/);
  // the .faq-* animation rules appear ONLY inside the no-preference block
  assert.equal([...css.matchAll(/\.faq-(side|under) \{ animation/g)].length, 2);
  assert.match(faq, /<button\s+type="button"/); // real buttons: Enter and Space work, Tab moves between them
  assert.match(faq, /focus-visible:outline-2/);
  assert.match(faq, /min-h-14/); // a large tap target
});

test("FAQs: the answers are short, plain drafts for Sarah to approve; the pricing answers are kept aside, not lost", () => {
  assert.ok(en.faq.items.length >= 10);
  for (const it of en.faq.items) {
    assert.ok(it.q.endsWith("?"), it.q);
    assert.ok(it.a.length > 20 && it.a.length < 340, it.q);
  }
  assert.match(read("src/content/en.ts"), /DRAFT WORDING: to be approved by Sarah/);
  assert.deepEqual(en.faq.itemsLater.map((x) => x.q), ["Does Spotted work offline?", "How much does it cost?", "Is there a free trial?", "Can I cancel?"]);
  assert.ok(!en.faq.items.some((x) => /free trial|cancel|how much/i.test(x.q))); // not shown until prices are confirmed
  assert.match(JSON.stringify(en.faq.items), /1, 5, 10 or 15 km/);
  assert.doesNotMatch(JSON.stringify(en.faq.items), /200 m|300 m|500 m/);
});

test("the pages are called About us and FAQs", () => {
  assert.equal(en.nav.faq, "FAQs");
  assert.equal(en.nav.faqs, "FAQs");
});
