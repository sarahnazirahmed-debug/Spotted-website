// Stage 9: the reference code, and the "We got your form" screen.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { CODE_NOTE, SHAPE, isMissingFunction, isReferenceCode, splitCode } from "../src/lib/referenceCode.ts";
import { buildPayload, emptyValues } from "../src/lib/insiderForm.ts";
import { en } from "../src/content/en.ts";
import { attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const U = (n) => `${String(n).padStart(8, "0")}-1111-1111-1111-111111111111`;

const insider = (over = {}) => ({
  ...buildPayload({
    ...emptyValues(), type: "solo", firstName: "Sara", lastName: "Khan", dob: "1995-04-20", emirate: "Abu Dhabi", email: "sara@example.com", phone: "+971501234567", sameAsPhone: true,
    accounts: [{ link: "https://www.instagram.com/sara.eats", handle: "sara.eats" }], verified: { email: "sara@example.com", personalEmail: "", backupEmail: "", phone: "", whatsapp: "" },
    accepted: { terms: true, privacy: true, confidentiality: true },
  }, { permit: `pending/${U(1)}/permit.pdf` }, false), ...over,
});
const partner = (over = {}) => ({
  kind: "partner", contact_name: "Omar Ali", email: "omar@example.com", phone: "+971501112222", business_name: "Test Cafe", business_type: "Cafe", instagram: "testcafe",
  emirate: "Dubai", trade_licence_path: `pending/${U(2)}/licence.pdf`, food_permit_path: `pending/${U(3)}/food-permit.pdf`,
  accepted_terms: true, accepted_privacy: true, accepted_confidentiality: true, ...over, // NO branches
});
const call = (db, fn, p) => attempt(db, null, `select public.${fn}($1::jsonb) as c`, [JSON.stringify(p)]);
const save = async (db, fn, p) => (await db.query(`select public.${fn}($1::jsonb) as c`, [JSON.stringify(p)])).rows[0].c;

// ---------------------------------------------------------------- the code rules
test("Partner codes are 4 letters then 4 numbers; Insider codes are 6 letters then 6 numbers; letters first", () => {
  assert.deepEqual([SHAPE.partner.letters, SHAPE.partner.numbers, SHAPE.insider.letters, SHAPE.insider.numbers], [4, 4, 6, 6]);
  assert.ok(isReferenceCode("partner", "QMTR4827"));
  assert.ok(isReferenceCode("insider", "WXZKPL705314".replace("0", "2").replace("1", "3")));
  assert.equal(isReferenceCode("partner", "QMTR48277"), false);
  assert.equal(isReferenceCode("partner", "4827QMTR"), false); // numbers first
  assert.equal(isReferenceCode("insider", "QMTR4827"), false); // wrong length for an Insider
  for (const bad of ["OMTR4827", "IMTR4827", "QMTR0827", "QMTR4817", "qmtr4827"]) assert.equal(isReferenceCode("partner", bad), false, bad); // O, I, 0, 1, small letters
  assert.deepEqual(splitCode("partner", "QMTR4827"), { letters: "QMTR", numbers: "4827" });
  assert.deepEqual(splitCode("insider", "WXZKPL725314"), { letters: "WXZKPL", numbers: "725314" });
});

test("the note under the code says it is a reference number for now", () => {
  assert.equal(CODE_NOTE, "Reference number for now. It becomes your active code once the team approves you.");
});

test("a database without the code functions is recognised, so the form still works until the file is run", () => {
  assert.equal(isMissingFunction({ code: "PGRST202" }), true);
  assert.equal(isMissingFunction({ code: "42883" }), true);
  assert.equal(isMissingFunction({ message: "Could not find the function public.x in the schema cache" }), true);
  assert.equal(isMissingFunction({ code: "P0001", message: "APPLY: Please tick all three boxes" }), false);
  assert.equal(isMissingFunction(null), false);
});

// ---------------------------------------------------------------- the database makes the codes
test("database: an Insider application gets 6 letters + 6 numbers back, a Partner application 4 + 4", async () => {
  const db = await makeDb();
  const i = await call(db, "submit_insider_application_with_code", insider());
  assert.ok(i.ok, i.error);
  assert.match(i.rows[0].c, /^[A-HJ-NP-Z]{6}[2-9]{6}$/);
  const p = await call(db, "submit_application_with_code", partner());
  assert.ok(p.ok, p.error);
  assert.match(p.rows[0].c, /^[A-HJ-NP-Z]{4}[2-9]{4}$/);
});

test("database: the Partner form no longer asks for branches (one is the starting number)", async () => {
  const db = await makeDb();
  await save(db, "submit_application_with_code", partner());
  assert.equal((await db.query("select branches from public.applications")).rows[0].branches, 1);
  // sending a number of branches still works for anyone who sends one
  assert.ok((await call(db, "submit_application_with_code", partner({ branches: 3 }))).ok);
  // and the other Partner rules are still checked
  assert.match((await call(db, "submit_application_with_code", partner({ emirate: "Paris" }))).error, /emirate/);
});

test("database: codes never use O, I, 0 or 1 and are all different (100 applications)", async () => {
  const db = await makeDb();
  const codes = [];
  for (let n = 0; n < 50; n++) {
    codes.push(await save(db, "submit_insider_application_with_code", insider({ email: `s${n}@example.com`, advertiser_permit_path: `pending/${U(n + 10)}/permit.pdf` })));
    codes.push(await save(db, "submit_application_with_code", partner({ email: `p${n}@example.com`, trade_licence_path: `pending/${U(n + 100)}/licence.pdf`, food_permit_path: `pending/${U(n + 200)}/food-permit.pdf` })));
  }
  assert.equal(new Set(codes).size, 100);
  for (const c of codes) assert.doesNotMatch(c, /[OI01]/);
  const letters = new Set(codes.join("").replace(/[0-9]/g, ""));
  const digits = new Set(codes.join("").replace(/[A-Z]/g, ""));
  assert.ok(letters.size >= 15 && digits.size >= 6); // really random, not a few repeated characters
});

test("database: a code cannot be typed or changed, and visitors cannot read the table", async () => {
  const db = await makeDb();
  await save(db, "submit_insider_application_with_code", insider({ reference_code: "AAAAAA222222" }));
  const row = (await db.query("select reference_code from public.applications")).rows[0].reference_code;
  assert.notEqual(row, "AAAAAA222222"); // a code sent in the form is ignored
  await db.exec("update public.applications set reference_code = 'BBBBBB333333', status = 'Approved'");
  assert.equal((await db.query("select reference_code, status from public.applications")).rows[0].reference_code, row); // never changes, even on approval
  assert.equal((await db.query("select status from public.applications")).rows[0].status, "Approved");
  const read1 = await attempt(db, null, "select reference_code from public.applications");
  assert.ok(!read1.ok || read1.rows.length === 0);
  assert.equal((await attempt(db, null, "insert into public.applications (kind) values ('insider')")).ok, false);
  const bad = await attempt(db, null, "select public.apply_make_reference_code(4, 4)");
  assert.equal(bad.ok, false); // the helper functions are not callable from the website
});

test("database: applications saved before this file get a code too", async () => {
  const db = await makeDb({ skip: ["apply_reference_codes.sql"] });
  await db.exec(`insert into public.applications (kind, contact_name, email, phone, accepted_terms_at, accepted_privacy_at, accepted_confidentiality_at, business_name, business_type, emirate, branches, trade_licence_path, food_permit_path)
    values ('partner', 'Old', 'old@example.com', '+971500000000', now(), now(), now(), 'Old Cafe', 'Cafe', 'Dubai', 1, 'pending/${U(7)}/licence.pdf', 'pending/${U(8)}/food-permit.pdf')`);
  await db.exec(read("supabase/apply_reference_codes.sql"));
  assert.match((await db.query("select reference_code from public.applications")).rows[0].reference_code, /^[A-HJ-NP-Z]{4}[2-9]{4}$/);
});

test("database: the code files are new and the older files were not edited", () => {
  assert.ok(existsSync("supabase/apply_reference_codes.sql"));
  for (const f of readdirSync("supabase").filter((x) => x.endsWith(".sql") && x !== "apply_reference_codes.sql")) assert.doesNotMatch(read(`supabase/${f}`), /reference_code/, f);
});

// ---------------------------------------------------------------- the screen
const conf = code("src/components/apply/ApplyConfirmation.tsx");

test("'We got your form' shows the big code, a Copy button and the note, as text only (no QR code)", () => {
  assert.equal(en.insiderForm.doneTitle, "We got your form");
  assert.match(conf, /\{t\.doneTitle\}/);
  assert.match(conf, /text-\[clamp\(1\.9rem,7vw,3rem\)\]/); // big
  assert.match(conf, /whitespace-nowrap">\{parts\.letters\}/); // the letters stay together, and so do the numbers
  assert.match(conf, /splitCode\(kind, code\)/);
  assert.match(conf, /navigator\.clipboard\.writeText\(code\)/);
  assert.match(conf, /execCommand\("copy"\)/); // older browsers
  assert.match(conf, /select-all/);
  assert.match(conf, /\{CODE_NOTE\}/);
  assert.deepEqual([en.insiderForm.copy, en.insiderForm.copied], ["Copy code", "Copied"]);
  assert.doesNotMatch(conf, /qr|<canvas|<img|barcode/i); // letters only
  assert.match(conf, /min-h-12/); // a big tap target
});

test("both forms show this screen after sending: the Insider wizard and the Partner form", () => {
  assert.match(code("src/components/apply/InsiderWizard.tsx"), /<ApplyConfirmation kind="insider" code=\{code\} \/>/);
  assert.match(code("src/components/apply/InsiderWizard.tsx"), /rpc\("submit_insider_application_with_code"/);
  const partnerForm = code("src/components/apply/ApplyForm.tsx");
  assert.match(partnerForm, /if \(done\) return <ApplyConfirmation kind="partner" code=\{doneCode\} \/>/);
  assert.match(partnerForm, /"submit_application_with_code"/);
});

test("the Partner form does not ask for branches any more", () => {
  const f = code("src/components/apply/ApplyForm.tsx");
  assert.doesNotMatch(f, /id="branches"/);
  assert.doesNotMatch(f, /par\.branches/);
  assert.doesNotMatch(code("src/lib/applyRules.ts"), /v\.branches/);
});

test("only the floating Rate us star shows here: WhatsApp is hidden, and the card never opens by itself", () => {
  assert.match(conf, /document\.documentElement\.dataset\.hideWhatsapp = "true"/);
  assert.match(conf, /delete document\.documentElement\.dataset\.hideWhatsapp/); // it comes back when the screen goes
  assert.match(code("src/components/WhatsApp.tsx"), /data-whatsapp=""/);
  assert.match(read("src/app/globals.css"), /html\[data-hide-whatsapp\] \[data-whatsapp\] \{ display: none; \}/);
  // the star is still on the page (it lives in SiteChrome)
  assert.match(code("src/components/SiteChrome.tsx"), /FEATURES\.feedbackStar && <RateStar \/>/);
  // the Rate us card opens ONLY from a tap on the star or the footer link: never from an effect on its own
  const star = code("src/components/rate/RateStar.tsx");
  const calls = [...star.matchAll(/\bopen\(([^)]*)\)/g)].map((m) => m.index);
  assert.ok(calls.length >= 2);
  assert.match(star, /onClick=\{\(\) => \{\s*if \(suppressClick\.current\) return;\s*open\(\);/);
  assert.match(star, /window\.setTimeout\(\(\) => open\(d\), 0\)/); // the footer link event
  assert.doesNotMatch(code("src/components/apply/ApplyConfirmation.tsx"), /RATE_OPEN_EVENT|dispatchEvent/); // this screen never asks the card to open
});

test("the new parts use no colour codes and no emoji", () => {
  for (const f of ["src/components/apply/ApplyConfirmation.tsx", "src/lib/referenceCode.ts"]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(code(f), /\p{Extended_Pictographic}/u, f);
  }
});
