// Stage 8: the 7-step Insider application.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { checkEmail, KNOWN_DOMAINS } from "../src/lib/emailCheck.ts";
import { COUNTRY, STEPS, buildPayload, emailVerified, emptyValues, filledAccounts, firstBadStep, stepProblem, summary } from "../src/lib/insiderForm.ts";
import { FEATURES } from "../src/config/features.ts";
import { en } from "../src/content/en.ts";
import { attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const TODAY = new Date("2026-11-12");

// a complete, valid SOLO application
const solo = () => ({
  ...emptyValues(), type: "solo", firstName: "Sara", lastName: "Khan", dob: "1995-04-20", emirate: "Abu Dhabi",
  email: "sara@example.com", phone: "+971 50 123 4567", sameAsPhone: true,
  accounts: [{ link: "https://www.instagram.com/sara.eats", handle: "@Sara.Eats" }],
  verified: { email: "sara@example.com", personalEmail: "", backupEmail: "", phone: "", whatsapp: "" },
  accepted: { terms: true, privacy: true, confidentiality: true },
});
const agency = () => ({ ...solo(), type: "agency", companyName: "Bright Media", contactFirst: "Omar", contactLast: "Ali", contactDob: "1990-01-01" });
const bad = (step, v, ctx = { today: TODAY }) => stepProblem(step, v, ctx);

// ---------------------------------------------------------------- emails
test("an email with no @, or an ending like .con, says it does not look right", () => {
  for (const e of ["sara.example.com", "sara@", "@example.com", "sara@example", "sara@gmail.con", "sara@yahoo.cmo", "sara@outlook.coom"]) assert.equal(checkEmail(e).problem, "That email does not look right.", e);
  for (const e of ["sara@example.com", "sara@my-company.ae", "a.b+c@sub.example.co.uk"]) assert.equal(checkEmail(e).problem, null, e);
  assert.equal(checkEmail("").ok, false);
});

test("a near miss of Gmail, Yahoo, Hotmail, Outlook or iCloud says 'Did you mean ...?'", () => {
  const sug = (e) => checkEmail(e).suggestion;
  assert.equal(sug("sara@iclood.com"), "sara@icloud.com");
  assert.equal(sug("sara@gmial.com"), "sara@gmail.com");
  assert.equal(sug("sara@gmal.com"), "sara@gmail.com");
  assert.equal(sug("sara@yahooo.com"), "sara@yahoo.com");
  assert.equal(sug("sara@hotmial.com"), "sara@hotmail.com");
  assert.equal(sug("sara@outlok.com"), "sara@outlook.com");
  assert.equal(sug("sara@gmail.con"), "sara@gmail.com"); // a bad ending AND a known provider
  for (const d of KNOWN_DOMAINS) assert.equal(sug(`sara@${d}`), null, d); // the real ones are left alone
  assert.equal(sug("sara@my-company.ae"), null);
  assert.equal(sug("sara@example.com"), null);
  assert.equal(checkEmail("sara@iclood.com").ok, false); // a suggestion stops it going on until the person decides
});

// ---------------------------------------------------------------- the seven steps
test("there are seven steps, in this order, each with a plain heading", () => {
  assert.deepEqual([...STEPS], ["joining", "type", "details", "emails", "phones", "social", "documents"]);
  assert.equal(en.insiderForm.steps.length, 7);
  for (const s of en.insiderForm.steps) assert.ok(s.title && s.lead);
});

test("step 1: Regular needs nothing; Founding (by invitation) needs the invite code", () => {
  assert.equal(bad("joining", { ...emptyValues(), joinType: "regular" }), null);
  assert.match(bad("joining", { ...emptyValues(), joinType: "founding" }), /invite code/);
  assert.equal(bad("joining", { ...emptyValues(), joinType: "founding", inviteCode: "ABC123" }), null);
});

test("step 2: solo creator or marketing agency / company", () => {
  assert.match(bad("type", emptyValues()), /Please choose/);
  assert.equal(bad("type", solo()), null);
  assert.equal(bad("type", agency()), null);
});

test("step 3 solo: first and last name, 18 or over, emirate; gender defaults to 'I prefer not to say'", () => {
  assert.equal(emptyValues().gender, "none");
  assert.equal(bad("details", solo()), null);
  assert.match(bad("details", { ...solo(), firstName: "" }), /first name/);
  assert.match(bad("details", { ...solo(), lastName: " " }), /last name/);
  assert.equal(bad("details", { ...solo(), middleName: "" }), null); // middle name is optional
  assert.match(bad("details", { ...solo(), dob: "2012-06-01" }), /18 or over/);
  assert.match(bad("details", { ...solo(), dob: "" }), /date of birth/);
  assert.equal(bad("details", { ...solo(), dob: "2008-11-12" }), null); // exactly 18 today
  assert.match(bad("details", { ...solo(), dob: "2008-11-13" }), /18 or over/); // 18 tomorrow
  assert.match(bad("details", { ...solo(), emirate: "" }), /emirate/);
});

test("step 3 agency: company name, UAE (locked), emirate, and a contact person who is 18 or over", () => {
  assert.equal(COUNTRY, "UAE");
  assert.equal(bad("details", agency()), null);
  assert.match(bad("details", { ...agency(), companyName: "" }), /company name/);
  assert.match(bad("details", { ...agency(), emirate: "Paris" }), /emirate/);
  assert.match(bad("details", { ...agency(), contactFirst: "" }), /first name/);
  assert.match(bad("details", { ...agency(), contactLast: "" }), /last name/);
  assert.match(bad("details", { ...agency(), contactDob: "2015-01-01" }), /18 or over/);
});

test("step 4: the business email is required and must be verified; the other two are optional", () => {
  assert.equal(bad("emails", solo()), null);
  assert.match(bad("emails", { ...solo(), email: "" }), /business email/i);
  assert.match(bad("emails", { ...solo(), email: "sara.example.com", verified: { ...solo().verified, email: "sara.example.com" } }), /does not look right/);
  assert.match(bad("emails", { ...solo(), verified: { ...solo().verified, email: "" } }), /verify the business email/);
  // changing the email after the code takes the tick away
  const changed = { ...solo(), email: "other@example.com" };
  assert.equal(emailVerified(changed, "email"), false);
  assert.match(bad("emails", changed), /verify/);
  assert.equal(emailVerified({ ...solo(), email: "  SARA@example.com " }, "email"), true); // capitals and spaces do not matter
  // optional emails: fine empty, but if typed they must look right (verifying them is optional)
  assert.equal(bad("emails", { ...solo(), personalEmail: "p@example.com", backupEmail: "b@example.com" }), null);
  assert.match(bad("emails", { ...solo(), personalEmail: "nope" }), /personal email/);
  assert.match(bad("emails", { ...solo(), backupEmail: "x@gmail.con" }), /backup email/);
});

test("step 5: phone, WhatsApp (or same as phone), optional backup phone and landline", () => {
  assert.equal(bad("phones", solo()), null);
  assert.match(bad("phones", { ...solo(), phone: "" }), /phone number/);
  assert.match(bad("phones", { ...solo(), sameAsPhone: false, whatsapp: "" }), /WhatsApp/);
  assert.equal(bad("phones", { ...solo(), sameAsPhone: false, whatsapp: "+971 55 000 1111" }), null);
  assert.match(bad("phones", { ...solo(), backupPhone: "abc" }), /backup phone/);
  assert.match(bad("phones", { ...solo(), landline: "12" }), /landline/);
  assert.equal(bad("phones", { ...solo(), backupPhone: "", landline: "" }), null);
});

test("phone codes: not required while SMS is OFF (it costs money); required once it is ON", () => {
  assert.equal(FEATURES.smsVerification, false);
  assert.equal(bad("phones", solo(), { today: TODAY, smsOn: false }), null);
  assert.match(bad("phones", solo(), { today: TODAY, smsOn: true }), /verify your phone/);
  const ok = { ...solo(), verified: { ...solo().verified, phone: "+971501234567" } };
  assert.equal(bad("phones", ok, { today: TODAY, smsOn: true }), null); // same-as-phone WhatsApp is free: nothing more to verify
  assert.match(bad("phones", { ...ok, sameAsPhone: false, whatsapp: "+971 55 000 1111" }, { today: TODAY, smsOn: true }), /verify your WhatsApp/);
});

test("step 6: at least ONE of Instagram (link + handle) or TikTok (handle)", () => {
  assert.equal(bad("social", solo()), null);
  assert.match(bad("social", { ...solo(), accounts: [{ link: "", handle: "" }] }), /at least one account/);
  assert.equal(bad("social", { ...solo(), accounts: [{ link: "", handle: "" }], tiktok: "@sara.eats" }), null); // TikTok alone is enough
  assert.match(bad("social", { ...solo(), accounts: [{ link: "https://instagram.com/x", handle: "" }] }), /Instagram handle/);
  assert.match(bad("social", { ...solo(), accounts: [{ link: "x", handle: "@x" }] }), /profile link/);
  assert.match(bad("social", { ...solo(), tiktok: "not a handle!" }), /TikTok/);
  assert.equal(bad("social", { ...solo(), youtube: "https://www.youtube.com/@sara", snapchat: "sara.snap", otherName: "Pinterest", otherLink: "https://pinterest.com/sara" }), null);
  assert.match(bad("social", { ...solo(), youtube: "youtube" }), /YouTube/);
  assert.match(bad("social", { ...solo(), otherName: "Pinterest" }), /name and its link/);
});

test("step 6: a solo creator adds one Instagram account; an agency can add several", () => {
  const two = [{ link: "https://instagram.com/a", handle: "a" }, { link: "https://instagram.com/b", handle: "b" }];
  assert.match(bad("social", { ...solo(), accounts: two }), /one Instagram account/);
  assert.equal(bad("social", { ...agency(), accounts: two }), null);
  assert.equal(filledAccounts({ ...agency(), accounts: [...two, { link: "", handle: "" }] }).length, 2); // an empty row is ignored
  const eleven = Array.from({ length: 11 }, (_, i) => ({ link: `https://instagram.com/a${i}`, handle: `a${i}` }));
  assert.match(bad("social", { ...agency(), accounts: eleven }), /up to 10/);
});

test("the whole form: the first step with a problem is found; a complete one has none", () => {
  assert.equal(firstBadStep(solo(), { today: TODAY }), null);
  assert.equal(firstBadStep(agency(), { today: TODAY }), null);
  assert.equal(firstBadStep({ ...solo(), phone: "" }, { today: TODAY }), "phones");
  assert.equal(firstBadStep({ ...solo(), firstName: "", phone: "" }, { today: TODAY }), "details");
});

test("the final screen has seven cards, one per step, and nothing is hidden", () => {
  const cards = summary(solo(), { permit: "permit.pdf", licence: "" });
  assert.deepEqual(cards.map((c) => c.step), [...STEPS]);
  assert.equal(cards.length, 7);
  assert.match(cards[2].lines.join(" "), /Sara Khan/);
  assert.match(cards[3].lines.join(" "), /sara@example\.com \(verified\)/);
  assert.match(cards[6].lines.join(" "), /permit\.pdf/);
  assert.match(summary(agency(), { permit: "a.pdf", licence: "" })[6].lines.join(" "), /Trade licence: missing/);
});

test("the payload: cleaned, UAE, gender default, handles without @, verified flags from the codes", () => {
  const p = buildPayload(solo(), { permit: "pending/x/permit.pdf" }, false);
  assert.equal(p.applicant_type, "solo");
  assert.equal(p.country, "UAE");
  assert.equal(p.gender, "none");
  assert.deepEqual(p.instagram_accounts, [{ link: "https://www.instagram.com/sara.eats", handle: "sara.eats" }]);
  assert.equal(p.email_verified, true);
  assert.equal(p.personal_email_verified, false);
  assert.equal(p.phone_verified, false); // SMS is off, so nothing is claimed as verified
  assert.equal(p.whatsapp, "+971 50 123 4567");
  assert.equal(p.whatsapp_same_as_phone, true);
  assert.equal(p.advertiser_permit_path, "pending/x/permit.pdf");
  assert.equal(p.accepted_terms && p.accepted_privacy && p.accepted_confidentiality, true);
  assert.equal(buildPayload(agency(), {}, false).instagram_accounts.length, 1);
});

// ---------------------------------------------------------------- the screens
const wiz = code("src/components/apply/InsiderWizard.tsx");

test("a progress bar, one screen per step, and a review screen with seven cards", () => {
  assert.match(wiz, /role="progressbar"/);
  assert.match(wiz, /STEPS\.map\(\(s, i\)/);
  assert.match(wiz, /\{id === "joining" && /);
  for (const s of ["type", "details", "emails", "phones", "social", "documents"]) assert.match(wiz, new RegExp(`id === "${s}"`), s);
  assert.match(wiz, /\{id && \(\s*<form onSubmit=\{next\}/); // only the current step is on screen (not stacked)
  assert.match(wiz, /summary\(v, /);
  assert.match(wiz, /lg:grid-cols-4/);
});

test("Next is blocked by the step's problem, and a changed email loses its tick", () => {
  assert.match(wiz, /stepProblem\(id, v, ctx\) \?\? filesProblem\(id\)/);
  assert.match(code("src/components/apply/CodeRow.tsx"), /checkEmail\(value\)/);
  assert.match(code("src/components/apply/CodeRow.tsx"), /Did you mean/);
});

test("documents: PDF only, 5 MB, stored in the private bucket; the Advertiser Permit is required, the trade licence only for agencies", () => {
  assert.match(wiz, /accept="application\/pdf,\.pdf"/);
  assert.match(wiz, /pdfProblem\(/);
  assert.match(wiz, /storage\.from\("applications"\)\.upload\(/);
  assert.match(wiz, /Please add your UAE Advertiser Permit/);
  assert.match(wiz, /v\.type === "agency" && !files\.licence/);
});

test("final screen: three tick boxes with links, and the magnetic Submit button", () => {
  for (const href of ['"/terms"', '"/privacy"', '"/confidentiality"']) assert.ok(wiz.includes(href), href);
  assert.match(wiz, /<VerifyButton state=\{status\} words=\{SUBMIT_WORDS\} \/>/);
  assert.deepEqual([en.insiderForm.submit, en.insiderForm.sending, en.insiderForm.submitted], ["Submit", "Sending", "Submitted"]);
  assert.match(code("src/components/code/VerifyButton.tsx"), /onPointerMove=\{pull\}/); // the same leaning button
  assert.match(wiz, /Please tick all three boxes/);
});

test("sending: the application is saved by the database function and the cards fly into a bookmark", () => {
  assert.match(wiz, /rpc\("submit_insider_application"/);
  assert.match(wiz, /function fly\(\)/);
  assert.match(wiz, /scale\(0\.08\)/); // the cards shrink into the bookmark
  assert.match(wiz, /fill="var\(--coral\)"/); // the bookmark is coral red
  assert.match(wiz, /translate\(-50%, 40px\)/); // it drops down
  assert.match(wiz, /scaleX\(6\)/); // and opens into the confirmation
  assert.match(wiz, /if \(reduced\(\) \|\| !cards\.current \|\| !bookmark\.current\) return setPhase\("done"\)/); // Reduce Motion: straight to the confirmation
  assert.equal(en.insiderForm.doneTitle, "We got your form");
});

test("the Insider form is used for Insiders; the Partner form is left alone", () => {
  const page = code("src/components/apply/ApplyPage.tsx");
  assert.match(page, /partner \? <ApplyForm \/> : <InsiderWizard \/>/);
  assert.match(read("src/components/apply/ApplyForm.tsx"), /submit_application/); // still the old function
});

test("the new parts use no colour codes and no emoji; the words are marked as a draft", () => {
  for (const f of ["src/components/apply/InsiderWizard.tsx", "src/components/apply/CodeRow.tsx", "src/lib/insiderForm.ts", "src/lib/emailCheck.ts"]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(code(f), /\p{Extended_Pictographic}/u, f);
  }
  assert.match(read("src/content/en.ts"), /The Insider application \(7 steps\)\. DRAFT WORDING: to be approved by Sarah/);
});

test("email codes are real; phone codes are not connected, and a different WhatsApp is not asked to be verified here", () => {
  const v = code("src/lib/verification.ts");
  assert.match(v, /signInWithOtp/);
  assert.match(v, /verifyOtp/);
  assert.match(v, /signOut\(\{ scope: "local" \}\)/); // nobody stays logged in
  assert.match(v, /Phone codes are not open yet/);
  assert.doesNotMatch(wiz, /sendPhoneCode|checkPhoneCode/); // no SMS is sent anywhere
});

// ---------------------------------------------------------------- the database function
const payload = (over = {}) => ({ ...buildPayload(solo(), { permit: "pending/11111111-1111-1111-1111-111111111111/permit.pdf" }, false), ...over });
const send = (db, p) => attempt(db, null, "select public.submit_insider_application($1::jsonb) as id", [JSON.stringify(p)]);

test("database: a good solo application is saved as New with every answer", async () => {
  const db = await makeDb();
  const r = await send(db, payload());
  assert.ok(r.ok, r.error);
  const row = (await db.query("select * from public.applications")).rows;
  assert.equal(row.length, 0); // attempt() rolls back, so save for real below
  await db.exec(`select public.submit_insider_application('${JSON.stringify(payload()).replace(/'/g, "''")}'::jsonb)`);
  const a = (await db.query("select * from public.applications")).rows[0];
  assert.equal(a.status, "New");
  assert.equal(a.kind, "insider");
  assert.equal(a.applicant_type, "solo");
  assert.equal(a.contact_name, "Sara Khan");
  assert.equal(a.first_name, "Sara");
  assert.equal(a.gender, "none");
  assert.equal(a.country, "UAE");
  assert.equal(a.email, "sara@example.com");
  assert.equal(a.email_verified, true);
  assert.equal(a.whatsapp_same_as_phone, true);
  assert.deepEqual(a.instagram_accounts, [{ link: "https://www.instagram.com/sara.eats", handle: "sara.eats" }]);
  assert.equal(a.instagram, "sara.eats");
});

test("database: an agency needs its trade licence and an adult contact person, and keeps several Instagram accounts", async () => {
  const db = await makeDb();
  const ag = buildPayload(agency(), { permit: "pending/11111111-1111-1111-1111-111111111111/permit.pdf" }, false);
  const noLicence = await send(db, ag);
  assert.equal(noLicence.ok, false);
  assert.match(noLicence.error, /trade licence/);
  const two = { ...ag, trade_licence_path: "pending/11111111-1111-1111-1111-111111111111/licence.pdf", instagram_accounts: [{ link: "https://instagram.com/a", handle: "a" }, { link: "https://instagram.com/b", handle: "b" }] };
  assert.ok((await send(db, two)).ok);
  assert.match((await send(db, { ...two, contact_dob: "2014-01-01" })).error, /18 or over/);
  assert.match((await send(db, { ...two, company_name: "" })).error, /company name/);
});

test("database: the rules are checked again (18+, verified business email, a social account, one account for solo, the tick boxes)", async () => {
  const db = await makeDb();
  const rules = [
    [{ date_of_birth: "2015-01-01" }, /18 or over/],
    [{ email_verified: false }, /verify the business email/],
    [{ email: "no-at-sign" }, /valid business email/],
    [{ instagram_accounts: [], tiktok: "" }, /Instagram account or a TikTok/],
    [{ instagram_accounts: [{ link: "x", handle: "a" }] }, /profile link and a handle/],
    [{ instagram_accounts: [{ link: "https://i.com/a", handle: "a" }, { link: "https://i.com/b", handle: "b" }] }, /one Instagram account/],
    [{ accepted_terms: false }, /tick all three/],
    [{ advertiser_permit_path: "" }, /Advertiser Permit/],
    [{ advertiser_permit_path: "pending/not-a-real-id/permit.pdf" }, /Advertiser Permit/],
    [{ emirate: "Paris" }, /emirate/],
    [{ applicant_type: "robot" }, /choose solo/],
    [{ first_name: "" }, /first and last name/],
    [{ join_type: "founding", invite_code: "NOSUCHCODE" }, /invite code/],
  ];
  for (const [over, why] of rules) {
    const r = await send(db, payload(over));
    assert.equal(r.ok, false, JSON.stringify(over));
    assert.match(r.error, why, JSON.stringify(over));
  }
  assert.ok((await send(db, payload({ instagram_accounts: [], tiktok: "sara.eats" }))).ok); // TikTok alone is enough
});

test("database: visitors can send an application but cannot read any", async () => {
  const db = await makeDb();
  await db.exec(`select public.submit_insider_application('${JSON.stringify(payload()).replace(/'/g, "''")}'::jsonb)`);
  const read1 = await attempt(db, null, "select * from public.applications");
  assert.ok(!read1.ok || read1.rows.length === 0);
});

test("the SQL file exists, the old submit function is untouched, and the older files were not edited", () => {
  assert.ok(existsSync("supabase/apply_insider_form.sql"));
  assert.match(read("supabase/applications.sql"), /create function public\.submit_application\(p jsonb\)/);
  for (const f of readdirSync("supabase").filter((x) => x.endsWith(".sql") && x !== "apply_insider_form.sql" && x !== "apply_reference_codes.sql")) assert.doesNotMatch(read(`supabase/${f}`), /submit_insider_application/, f);
});

test("no form sits inside another form: the email code box is a plain box with a plain Verify button", () => {
  const row = code("src/components/apply/CodeRow.tsx");
  assert.doesNotMatch(row, /<form/);
  assert.match(row, /<VerifyButton state=\{status\} words=\{WORDS\} onPress=/);
  assert.match(row, /e\.key === "Enter"[\s\S]{0,60}preventDefault\(\)/); // Enter checks the code instead of moving to the next step
  assert.match(code("src/components/code/VerifyButton.tsx"), /type=\{onPress \? "button" : "submit"\}/);
});
