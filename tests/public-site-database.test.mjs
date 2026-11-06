// Tests for supabase/public_site.sql on a real in-memory Postgres: the contact forms and the live counters.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, as, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {};
before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", assoc: "assoc@example.com", staff: "staff@example.com", user: "user@example.com" })) {
    P[k] = { id: await addUser(db, email), email };
  }
  await db.exec(`
    insert into public.team_members (email, name, role) values
      ('main@example.com', 'Main', 'main_admin'), ('assoc@example.com', 'Assoc', 'associate'), ('staff@example.com', 'Staff', 'staff');
  `);
});

const contact = "insert into public.contact_requests (kind, name, business, phone, email) values ('restaurant', 'Sara', 'Cafe Luna', '+971500000000', 'a@b.com')";

test("anyone can send a contact request, even logged out", async () => {
  assert.equal((await attempt(db, null, contact)).ok, true);
  assert.equal((await attempt(db, P.user, contact)).ok, true);
});

test("nobody on the website can read contact requests back, except the main admin and associates", async () => {
  await db.exec(contact);
  assert.equal((await attempt(db, null, "select * from public.contact_requests")).ok, false);
  assert.equal((await attempt(db, P.user, "select * from public.contact_requests")).rows.length, 0);
  assert.equal((await attempt(db, P.staff, "select * from public.contact_requests")).rows.length, 0);
  assert.ok((await attempt(db, P.main, "select * from public.contact_requests")).rows.length >= 1);
  assert.ok((await attempt(db, P.assoc, "select * from public.contact_requests")).rows.length >= 1);
});

test("a contact request needs a way to reply, a real kind, and cannot pre-mark itself as handled", async () => {
  assert.equal((await attempt(db, null, "insert into public.contact_requests (kind, name) values ('shop', 'Sara')")).ok, false);
  assert.equal((await attempt(db, null, "insert into public.contact_requests (kind, name, email) values ('hacker', 'Sara', 'a@b.com')")).ok, false);
  assert.equal((await attempt(db, null, "insert into public.contact_requests (kind, name, email, handled) values ('shop', 'Sara', 'a@b.com', true)")).ok, false);
  assert.equal((await attempt(db, null, "insert into public.contact_requests (kind, name, email, notes) values ('shop', 'Sara', 'a@b.com', 'x')")).ok, false);
  assert.equal((await attempt(db, null, `insert into public.contact_requests (kind, name, email) values ('shop', '${"x".repeat(121)}', 'a@b.com')`)).ok, false);
});

test("nobody on the website can change or delete contact requests, except managers (update only)", async () => {
  await db.exec(contact);
  assert.equal((await attempt(db, null, "update public.contact_requests set handled = true")).ok, false);
  const u = await attempt(db, P.user, "update public.contact_requests set handled = true");
  assert.equal(u.ok && u.affected > 0, false);
  assert.equal((await attempt(db, P.main, "update public.contact_requests set handled = true")).ok, true);
  assert.equal((await attempt(db, P.main, "delete from public.contact_requests")).ok, false);
});

test("removal requests work the same way: anyone sends, only managers read", async () => {
  const ins = "insert into public.removal_requests (handles, email) values ('@creator', 'c@b.com')";
  assert.equal((await attempt(db, null, ins)).ok, true);
  await db.exec(ins);
  assert.equal((await attempt(db, null, "select * from public.removal_requests")).ok, false);
  assert.equal((await attempt(db, P.user, "select * from public.removal_requests")).rows.length, 0);
  assert.ok((await attempt(db, P.main, "select * from public.removal_requests")).rows.length >= 1);
  assert.equal((await attempt(db, null, "insert into public.removal_requests (handles, email) values ('', 'c@b.com')")).ok, false);
});

test("public_stats gives only totals, to anyone, and counts the right things", async () => {
  await db.exec(`
    update public.profiles set country = 'AE' where id = '${P.user.id}';
    insert into public.partner_accounts (owner_id, kind, business_name, status, country) values
      ('${P.main.id}', 'restaurant', 'Cafe', 'trial', 'AE'),
      ('${P.assoc.id}', 'influencer', 'Creator', 'active', 'AE'),
      ('${P.staff.id}', 'shop', 'Paused shop', 'paused', 'AE');
    insert into public.stats_counters (metric, country, value) values ('saves', 'AE', 120), ('saves', 'SA', 30);
  `);
  const r = await attempt(db, null, "select * from public.public_stats()");
  assert.equal(r.ok, true);
  const get = (metric, country) => Number(r.rows.find((x) => x.metric === metric && x.country === country)?.value ?? -1);
  assert.equal(get("people", "AE"), 1);
  assert.equal(get("people", "ALL"), 4); // the four accounts that exist (user, main, assoc, staff)
  assert.equal(get("partners", "AE"), 1); // the paused shop does not count
  assert.equal(get("partners", "ALL"), 1);
  assert.equal(get("insiders", "AE"), 1);
  assert.equal(get("saves", "AE"), 120);
  assert.equal(get("saves", "ALL"), 150);
  // only these four columns of totals come back: no emails, names or anything personal
  assert.deepEqual(Object.keys(r.rows[0]).sort(), ["country", "metric", "value"]);
});

test("nobody on the website reads the profiles or partner tables because of the counters", async () => {
  const anon = await attempt(db, null, "select * from public.profiles");
  assert.equal(anon.ok ? anon.rows.length : 0, 0); // logged out: no rows (or refused)
  assert.equal((await attempt(db, P.staff, "select * from public.profiles where id = '" + P.user.id + "'")).rows.length, 0);
});

test("only the main admin can change the saves numbers", async () => {
  const ins = "insert into public.stats_counters (metric, country, value) values ('saves', 'EG', 5)";
  assert.equal((await attempt(db, null, ins)).ok, false);
  assert.equal((await attempt(db, P.user, ins)).ok, false);
  assert.equal((await attempt(db, P.assoc, ins)).ok, false);
  assert.equal((await attempt(db, P.main, ins)).ok, true);
});
