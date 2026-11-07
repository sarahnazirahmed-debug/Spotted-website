// Tests for supabase/applications.sql, on a REAL (in-memory) Postgres database:
// the apply rules (18+, three ticks, invite codes, required PDFs) and who can read what.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, as, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {};
const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", assoc: "assoc@example.com", staff: "staff@example.com", helper: "helper@example.com", nobody: "nobody@example.com" })) {
    P[k] = { id: await addUser(db, email), email };
  }
  await db.exec(`insert into public.team_members (email, name, role) values
    ('main@example.com', 'Main Admin', 'main_admin'), ('assoc@example.com', 'Associate', 'associate'),
    ('staff@example.com', 'Staff', 'staff'), ('helper@example.com', 'Helper', 'helper');`);
});

const ticks = { accepted_terms: true, accepted_privacy: true, accepted_confidentiality: true };
const insider = (o = {}) => ({
  kind: "insider", join_type: "regular", contact_name: "Sara Test", email: "Sara@Example.com", phone: "+971 50 000 0000",
  date_of_birth: "1995-05-05", profile_link: "https://instagram.com/sara", instagram: "sara", advertiser_permit_path: `pending/${UUID(1)}/permit.pdf`,
  ...ticks, ...o,
});
const partner = (o = {}) => ({
  kind: "partner", contact_name: "Omar Owner", email: "omar@example.com", phone: "+971 50 111 1111", business_name: "Test Cafe", business_type: "Cafe",
  instagram: "testcafe", emirate: "Abu Dhabi", branches: 2, trade_licence_path: `pending/${UUID(2)}/licence.pdf`, food_permit_path: `pending/${UUID(2)}/food-permit.pdf`,
  ...ticks, ...o,
});
const submit = (who, payload) => attempt(db, who, "select public.submit_application($1::jsonb) as id", [JSON.stringify(payload)]);

test("a visitor can send a good Insider application; it is saved as New, with the email in lower case", async () => {
  const r = await as(db, null, async (d) => {
    await d.query("select public.submit_application($1::jsonb)", [JSON.stringify(insider())]);
    return d.query("select 1");
  });
  assert.ok(r);
  const ok = await submit(null, insider());
  assert.equal(ok.ok, true, ok.error);
  await db.exec("begin");
  await db.query("select public.submit_application($1::jsonb)", [JSON.stringify(insider())]);
  const row = (await db.query("select status, email, kind from public.applications")).rows[0];
  await db.exec("rollback");
  assert.deepEqual(row, { status: "New", email: "sara@example.com", kind: "insider" });
});

test("someone under 18 is refused (the age is worked out from the date of birth)", async () => {
  const young = new Date();
  young.setFullYear(young.getFullYear() - 17);
  const r = await submit(null, insider({ date_of_birth: young.toISOString().slice(0, 10) }));
  assert.equal(r.ok, false);
  assert.match(r.error, /18 or over/);
  // exactly 18 today is allowed
  const eighteen = new Date();
  eighteen.setFullYear(eighteen.getFullYear() - 18);
  assert.equal((await submit(null, insider({ date_of_birth: eighteen.toISOString().slice(0, 10) }))).ok, true);
  // a date in the future, or no date, is refused
  assert.equal((await submit(null, insider({ date_of_birth: "2999-01-01" }))).ok, false);
  assert.equal((await submit(null, insider({ date_of_birth: "" }))).ok, false);
});

test("all three tick boxes are needed: with one missing the message is the agreed one", async () => {
  for (const k of ["accepted_terms", "accepted_privacy", "accepted_confidentiality"]) {
    const r = await submit(null, insider({ [k]: false }));
    assert.equal(r.ok, false);
    assert.match(r.error, /Please tick all three boxes before you send\./);
  }
});

test("the UAE Advertiser Permit PDF is required for Insiders; the trade licence is optional", async () => {
  assert.equal((await submit(null, insider({ advertiser_permit_path: null }))).ok, false);
  assert.equal((await submit(null, insider({ advertiser_permit_path: "https://evil.example/x.pdf" }))).ok, false);
  assert.equal((await submit(null, insider({ advertiser_permit_path: `pending/${UUID(1)}/permit.exe` }))).ok, false);
  assert.equal((await submit(null, insider({ trade_licence_path: `pending/${UUID(1)}/licence.pdf` }))).ok, true);
  assert.equal((await submit(null, insider({ trade_licence_path: "../../secret.pdf" }))).ok, false);
});

test("Founding Insiders need an invite code made by the team; each code works once", async () => {
  assert.equal((await submit(null, insider({ join_type: "founding", invite_code: "NOPE123456" }))).ok, false);
  await db.exec("begin");
  try {
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: P.main.id, email: P.main.email })]);
    const code = (await db.query("select public.create_invite_code('for Sara') as c")).rows[0].c;
    assert.match(code, /^[A-HJ-NP-Z]{6}[2-9]{4}$/); // 6 letters then 4 numbers, no O, I, 0 or 1
    await db.exec("reset role");
    await db.exec("set local role anon");
    await db.query("select public.submit_application($1::jsonb)", [JSON.stringify(insider({ join_type: "founding", invite_code: code.toLowerCase() }))]);
    await assert.rejects(db.query("select public.submit_application($1::jsonb)", [JSON.stringify(insider({ join_type: "founding", invite_code: code }))]), /already been used/);
  } finally {
    await db.exec("rollback");
  }
});

test("only the main admin and associates can make invite codes and read them", async () => {
  for (const who of [null, P.nobody, P.helper, P.staff]) {
    const r = await attempt(db, who, "select public.create_invite_code('x')");
    assert.equal(r.ok, false);
  }
  assert.equal((await attempt(db, P.assoc, "select public.create_invite_code('x')")).ok, true);
  assert.equal((await attempt(db, P.nobody, "select * from public.invite_codes")).rows?.length ?? 0, 0);
});

test("Partner: the licence is required, and the food permit is required for food and drink but not for a Shop", async () => {
  assert.equal((await submit(null, partner())).ok, true);
  assert.equal((await submit(null, partner({ trade_licence_path: null }))).ok, false);
  const noFood = await submit(null, partner({ food_permit_path: null }));
  assert.equal(noFood.ok, false);
  assert.match(noFood.error, /food permit/);
  assert.equal((await submit(null, partner({ business_type: "Shop", food_permit_path: null }))).ok, true);
  for (const t of ["Restaurant", "Cafe", "Cafeteria", "Bakery", "Sweets", "Cloud or home kitchen"]) assert.equal((await submit(null, partner({ business_type: t, food_permit_path: null }))).ok, false, t);
});

test("Partner: emirate, branches and kind must be valid", async () => {
  assert.equal((await submit(null, partner({ emirate: "Atlantis" }))).ok, false);
  assert.equal((await submit(null, partner({ branches: 0 }))).ok, false);
  assert.equal((await submit(null, partner({ business_type: "Spaceport" }))).ok, false);
});

test("nobody can write into the table directly, or read applications, except the main admin and associates", async () => {
  const direct = await attempt(db, null, "insert into public.applications (kind, contact_name, email, phone, accepted_terms_at, accepted_privacy_at, accepted_confidentiality_at) values ('insider','x','x@x.com','12345',now(),now(),now())");
  assert.equal(direct.ok, false);
  await db.exec("begin");
  await db.exec("set local role anon");
  await db.query("select public.submit_application($1::jsonb)", [JSON.stringify(insider())]);
  await db.exec("reset role");
  await db.exec("commit");
  try {
    for (const who of [null, P.nobody, P.helper, P.staff]) {
      const r = await attempt(db, who, "select * from public.applications");
      assert.equal(r.ok ? r.rows.length : 0, 0, "a person who should not see applications saw some");
    }
    assert.ok((await attempt(db, P.main, "select * from public.applications")).rows.length >= 1);
    assert.ok((await attempt(db, P.assoc, "select * from public.applications")).rows.length >= 1);
  } finally {
    await db.exec("delete from public.applications");
  }
});

test("the main admin can approve; staff cannot; the status can only be New, Approved or Declined, and only the status can change", async () => {
  await db.exec("select public.submit_application('" + JSON.stringify(insider()) + "'::jsonb)");
  try {
    assert.equal((await attempt(db, P.staff, "update public.applications set status = 'Approved'")).affected ?? 0, 0);
    const ok = await attempt(db, P.main, "update public.applications set status = 'Approved' returning decided_by");
    assert.equal(ok.ok, true, ok.error);
    assert.equal(ok.rows[0].decided_by, "Main Admin");
    assert.equal((await attempt(db, P.main, "update public.applications set status = 'Whatever'")).ok, false);
    assert.equal((await attempt(db, P.main, "update public.applications set email = 'x@y.com'")).ok, false);
  } finally {
    await db.exec("delete from public.applications; delete from public.invite_codes");
  }
});
