// Step 5 (Apply page and thank-you page): the form rules and how everything is wired. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ageFromDob, isAdult, insiderProblem, partnerProblem, pdfProblem, pdfPath, MAX_PDF_BYTES, isFoodType } from "../src/lib/applyRules.ts";
import { partnerLink, applyLink } from "../src/config/routes.ts";

const read = (f) => readFileSync(f, "utf8");
const today = new Date("2026-11-08T12:00:00Z");

test("the age is worked out from the date of birth (and 18 today counts)", () => {
  assert.equal(ageFromDob("2000-11-08", today), 26);
  assert.equal(ageFromDob("2000-11-09", today), 25);
  assert.equal(isAdult("2008-11-08", today), true);
  assert.equal(isAdult("2008-11-09", today), false);
  assert.equal(ageFromDob("2000-02-31", today), null); // not a real date
  assert.equal(ageFromDob("", today), null);
});

const goodInsider = {
  joinType: "regular", inviteCode: "", fullName: "Sara Test", dob: "1995-05-05", email: "sara@example.com", phone: "+971 50 000 0000",
  profileLink: "https://instagram.com/sara", instagram: "@sara", tiktok: "", youtube: "", snapchat: "", otherName: "", otherLink: "", hasPermit: true,
};
test("Insider form: a good one passes; each missing thing gives a clear message", () => {
  assert.equal(insiderProblem(goodInsider, today), null);
  assert.match(insiderProblem({ ...goodInsider, dob: "2010-01-01" }, today), /18 or over/);
  assert.match(insiderProblem({ ...goodInsider, hasPermit: false }, today), /Advertiser Permit/);
  assert.match(insiderProblem({ ...goodInsider, joinType: "founding" }, today), /invite code/);
  assert.equal(insiderProblem({ ...goodInsider, joinType: "founding", inviteCode: "ABCDEF2345" }, today), null);
  assert.match(insiderProblem({ ...goodInsider, instagram: "", tiktok: "" }, today), /Instagram or TikTok/);
  assert.match(insiderProblem({ ...goodInsider, otherName: "Twitch" }, today), /name and the link/);
  assert.match(insiderProblem({ ...goodInsider, email: "nope" }, today), /email/);
});

const goodPartner = {
  businessName: "Test Cafe", businessType: "Cafe", ownerName: "Omar", email: "o@example.com", phone: "+971 50 111 1111", instagram: "@testcafe",
  website: "", emirate: "Dubai", branches: "2", hasLicence: true, hasFoodPermit: true,
};
test("Partner form: licence always, food permit for food and drink only", () => {
  assert.equal(partnerProblem(goodPartner), null);
  assert.match(partnerProblem({ ...goodPartner, hasLicence: false }), /trade licence/);
  assert.match(partnerProblem({ ...goodPartner, hasFoodPermit: false }), /food permit/);
  assert.equal(partnerProblem({ ...goodPartner, businessType: "Shop", hasFoodPermit: false }), null);
  assert.equal(isFoodType("Cloud or home kitchen"), true);
  assert.equal(isFoodType("Shop"), false);
  assert.match(partnerProblem({ ...goodPartner, branches: "0" }), /branches/);
  assert.match(partnerProblem({ ...goodPartner, emirate: "" }), /emirate/);
});

test("uploads: only real PDFs, 5 MB at most", () => {
  const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  assert.equal(pdfProblem({ name: "a.pdf", type: "application/pdf", size: 1000 }, pdfHead), null);
  assert.match(pdfProblem({ name: "a.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 }, pdfHead), /5 MB/);
  assert.match(pdfProblem({ name: "a.png", type: "image/png", size: 1000 }, new Uint8Array([0x89, 0x50, 0x4e, 0x47])), /PDF/);
  assert.match(pdfProblem({ name: "fake.pdf", type: "application/pdf", size: 1000 }, new Uint8Array([1, 2, 3, 4])), /PDF/); // a renamed file
  assert.match(pdfPath("00000000-0000-4000-8000-000000000001", "permit"), /^pending\/[0-9a-f-]{36}\/permit\.pdf$/);
});

test("the form has the three tick boxes, the agreed red message, and a faded button that still shows the message", () => {
  const f = read("src/components/apply/ApplyForm.tsx");
  for (const k of ["terms", "privacy", "confidentiality"]) assert.match(f, new RegExp(`tick\\("${k}"`));
  assert.match(f, /if \(!allTicked\)/);
  assert.match(f, /opacity-50/);
  assert.match(f, /aria-disabled=\{!allTicked\}/);
  assert.match(f, /text-problem/); // the message is red
  const en = read("src/content/en.ts");
  assert.ok(en.includes("Please tick all three boxes before you send."));
  assert.ok(en.includes('send: "Send my application"'));
});

test("the form never asks the age; it shows the age worked out from the date of birth", () => {
  const f = read("src/components/apply/ApplyForm.tsx");
  assert.doesNotMatch(f, /label="Age"|id="age"/);
  assert.match(f, /ageFromDob\(ins\.dob\)/);
});

test("uploads go to the private bucket, one way in for the data, and then the thank-you page", () => {
  const f = read("src/components/apply/ApplyForm.tsx");
  assert.match(f, /storage\.from\("applications"\)\.upload/);
  assert.match(f, /rpc\("submit_application"/);
  assert.match(f, /router\.push\("\/apply\/thanks"\)/);
  assert.doesNotMatch(f, /getPublicUrl/);
  const sql = read("supabase/applications.sql");
  assert.match(sql, /'applications', 'applications', false, 5242880, array\['application\/pdf'\]/); // private, 5 MB, PDF only
});

test("the thank-you page says the agreed words", () => {
  const en = read("src/content/en.ts");
  assert.ok(en.includes("We have your application. We will check your details and contact you by email with the next steps. Once your dashboard is ready, you log in with the same email address. We send you a 6-digit code each time, so there is no password to remember."));
});

test("the Insider and Partner buttons open the right version of the one Apply page", () => {
  assert.equal(applyLink("insider"), "/apply?type=insider");
  assert.equal(applyLink("partner"), "/apply?type=partner");
  assert.equal(applyLink("insider", "founding"), "/apply?type=insider&how=founding");
  assert.equal(partnerLink("insider"), "/apply?type=insider");
  assert.equal(partnerLink("restaurants"), "/apply?type=partner");
  assert.match(read("src/components/insider/InsiderLanding.tsx"), /applyHref=\{partnerLink\("insider"\)\}/);
  assert.match(read("src/components/insider/PartnerLanding.tsx"), /applyHref=\{joinHref\}/);
  assert.match(read("src/components/insider/PartnerLanding.tsx"), /const joinHref = partnerLink\("restaurants"\)/);
});

test("the admin area has an Applications tab for the main admin and associates, and the email helper checks a secret", () => {
  assert.match(read("src/components/admin/AdminFrame.tsx"), /tab\("\/admin\/applications", "Applications"\)/);
  assert.match(read("src/components/admin/ApplicationsPage.tsx"), /createSignedUrl\(path, 60\)/); // PDFs open through a one-minute private link
  assert.doesNotMatch(read("src/components/admin/ApplicationsPage.tsx"), /getPublicUrl/);
  const fn = read("supabase/functions/notify-application/index.ts").replace(/^\s*\/\/.*$/gm, "");
  assert.match(fn, /x-webhook-secret/);
  assert.doesNotMatch(fn, /date_of_birth|phone/); // the email holds no personal details beyond the name
});

test("no emoji in the new files", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ["src/components/apply/ApplyForm.tsx", "src/components/apply/ApplyPage.tsx", "src/components/admin/ApplicationsPage.tsx", "src/app/apply/thanks/page.tsx"])
    assert.doesNotMatch(read(f), emoji, f);
});
