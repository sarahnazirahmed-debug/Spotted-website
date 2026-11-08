// Tests for supabase/dashboards.sql on a REAL (in-memory) Postgres database:
// approve starts access, the free period, who sees what, money only as a range, and access stopping (data kept).
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, as, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {};
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ticks = { accepted_terms: true, accepted_privacy: true, accepted_confidentiality: true };

before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", staff: "staff@example.com", ins: "ins@example.com", ins2: "ins2@example.com", par: "par@example.com", nobody: "nobody@example.com" }))
    P[k] = { id: await addUser(db, email), email };
  await db.exec(`insert into public.team_members (email, name, role) values ('main@example.com', 'Main Admin', 'main_admin'), ('staff@example.com', 'Staff', 'staff');`);
  const send = (o) => db.query("select public.submit_application($1::jsonb)", [JSON.stringify({ ...ticks, ...o })]);
  const ins = (email, extra = {}) => ({ kind: "insider", join_type: "regular", contact_name: "Ins", email, phone: "+971500000000", date_of_birth: "1990-01-01", profile_link: "https://x.com/a", instagram: "a", advertiser_permit_path: `pending/${U(1)}/permit.pdf`, ...extra });
  await send(ins("ins@example.com"));
  await send(ins("ins2@example.com", { join_type: "founding", invite_code: (await db.query("insert into public.invite_codes (code) values ('ABCDEF2345') returning code")).rows[0].code }));
  await send({ kind: "partner", contact_name: "Par", email: "par@example.com", phone: "+971500000001", business_name: "Cafe", business_type: "Shop", instagram: "cafe", emirate: "Dubai", branches: 1, trade_licence_path: `pending/${U(2)}/licence.pdf` });
});

const approve = (who, email, extra = "") => attempt(db, who, `update public.applications set status = 'Approved' ${extra} where email = '${email}'`);
const commitAs = async (who, sql) => {
  // run and KEEP the change (the tests below build on it)
  await db.exec("begin");
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who.id, email: who.email })]);
  try {
    const r = await db.query(sql);
    await db.exec("commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
};

test("before approval, nobody has a dashboard", async () => {
  const r = await attempt(db, P.ins, "select * from public.my_access()");
  assert.equal(r.rows.length, 0);
  assert.equal((await attempt(db, P.ins, "select public.my_numbers() as n")).rows[0].n, null);
});

test("staff cannot approve; the main admin can, and a regular member gets 2 free months", async () => {
  assert.equal((await approve(P.staff, "ins@example.com")).affected ?? 0, 0);
  await commitAs(P.main, "update public.applications set status = 'Approved' where email = 'ins@example.com'");
  const m = (await db.query("select kind, status, founding, (free_until > now() + interval '59 days' and free_until < now() + interval '62 days') as two_months from public.member_access where email = 'ins@example.com'")).rows[0];
  assert.deepEqual(m, { kind: "insider", status: "active", founding: false, two_months: true });
  assert.equal((await db.query("select count(*)::int as n from public.member_numbers")).rows[0].n, 1); // everything starts at zero
});

test("a Founding Insider cannot be approved until the owner types the free months for that person", async () => {
  await assert.rejects(commitAs(P.main, "update public.applications set status = 'Approved' where email = 'ins2@example.com'"), /free months/);
  await commitAs(P.main, "update public.applications set status = 'Approved', founding_free_months = 6 where email = 'ins2@example.com'");
  const m = (await db.query("select founding, (free_until > now() + interval '179 days' and free_until < now() + interval '186 days') as six from public.member_access where email = 'ins2@example.com'")).rows[0];
  assert.deepEqual(m, { founding: true, six: true });
});

test("a member sees their own access and numbers, all zero, with money only as words", async () => {
  const a = (await attempt(db, P.ins, "select kind, access_ok, founding from public.my_access()")).rows[0];
  assert.deepEqual(a, { kind: "insider", access_ok: true, founding: false });
  const n = (await attempt(db, P.ins, "select public.my_numbers() as n")).rows[0].n;
  assert.deepEqual(n, { kind: "insider", green_stars: 0, yellow_stars: 0, saves: 0, reels_added: 0, amount_range: "None yet", paid_until: null });
  // the member cannot read the numbers table (it holds money) or the member list
  assert.equal((await attempt(db, P.ins, "select * from public.member_numbers")).rows.length, 0);
  assert.equal((await attempt(db, P.ins, "select * from public.member_access")).rows.length, 0);
  assert.equal((await attempt(db, P.staff, "select * from public.member_numbers")).rows.length, 0); // staff never see money
});

test("money is a range: None yet, Under 1K, 10K to 50K ...", async () => {
  for (const [v, w] of [[0, "None yet"], [500, "Under 1K"], [5000, "1K to 10K"], [25000, "10K to 50K"], [60000, "50K to 100K"], [250000, "100K or more"]])
    assert.equal((await db.query("select public.amount_range($1) as r", [v])).rows[0].r, w);
});

test("an Insider adds and removes reels; a new reel is 'waiting'; others cannot see or remove them", async () => {
  const id = (await db.query("select id from public.member_access where email = 'ins@example.com'")).rows[0].id;
  assert.equal((await attempt(db, P.ins, `insert into public.insider_reels (member_id, url) values ('${id}', 'https://instagram.com/reel/1/') returning status`)).rows[0].status, "waiting");
  // the website does not send member_id: the database fills in MY member row
  assert.equal((await attempt(db, P.ins, "insert into public.insider_reels (url) values ('https://instagram.com/reel/77/') returning member_id")).rows[0].member_id, id);
  assert.equal((await attempt(db, P.par, "insert into public.insider_reels (url) values ('https://instagram.com/reel/78/')")).ok, false); // a Partner has no Insider row
  assert.equal((await attempt(db, P.ins, `insert into public.insider_reels (member_id, url, status) values ('${id}', 'https://instagram.com/reel/1/', 'checked')`)).ok, false);
  assert.equal((await attempt(db, P.ins, `insert into public.insider_reels (member_id, url) values ('${id}', 'not a link')`)).ok, false);
  await commitAs(P.ins, `insert into public.insider_reels (member_id, url, place_name) values ('${id}', 'https://instagram.com/reel/2/', 'Cafe')`);
  assert.equal((await attempt(db, P.ins, "select (public.my_numbers() ->> 'reels_added')::int as n")).rows[0].n, 1);
  assert.equal((await attempt(db, P.ins2, "select * from public.insider_reels")).rows.length, 0);
  assert.equal((await attempt(db, P.ins2, "delete from public.insider_reels")).affected ?? 0, 0);
  assert.equal((await attempt(db, P.par, `insert into public.insider_reels (member_id, url) values ('${id}', 'https://x.com/a')`)).ok, false);
  assert.equal((await attempt(db, P.ins, "delete from public.insider_reels")).affected, 1);
  assert.equal((await attempt(db, P.staff, "select * from public.insider_reels")).rows.length, 1); // the team can see them to check
});

test("a Partner adds items and offers; an offer needs an end date or 'always on'; Offers live counts only running offers", async () => {
  await commitAs(P.main, "update public.applications set status = 'Approved' where email = 'par@example.com'");
  const id = (await db.query("select id from public.member_access where email = 'par@example.com'")).rows[0].id;
  const add = (sql) => attempt(db, P.par, sql);
  assert.equal((await add(`insert into public.partner_items (member_id, name, price_aed) values ('${id}', 'Coffee', 12.5)`)).ok, true);
  assert.equal((await add(`insert into public.partner_items (member_id, name, price_aed) values ('${id}', 'Coffee', -1)`)).ok, false);
  assert.equal((await add(`insert into public.partner_offers (member_id, text, starts_on) values ('${id}', 'Free cake', current_date)`)).ok, false); // no end, not always on
  assert.equal((await add(`insert into public.partner_offers (member_id, text, starts_on, ends_on) values ('${id}', 'Bad', current_date, current_date - 1)`)).ok, false);
  await commitAs(P.par, `insert into public.partner_offers (member_id, text, starts_on, ends_on, always_on) values ('${id}', 'Always on', current_date, null, true), ('${id}', 'Ended', current_date - 10, current_date - 5, false), ('${id}', 'Later', current_date + 5, current_date + 9, false)`);
  const n = (await attempt(db, P.par, "select public.my_numbers() as n")).rows[0].n;
  assert.equal(n.kind, "partner");
  assert.equal(n.offers_live, 1);
  assert.equal(n.items, 0);
  assert.equal((await attempt(db, P.ins, `select * from public.partner_offers`)).rows.length, 0);
});

test("when the free period ends and nothing is paid, access stops but the data is kept; payment brings it back", async () => {
  const id = (await db.query("select id from public.member_access where email = 'ins@example.com'")).rows[0].id;
  await commitAs(P.ins, `insert into public.insider_reels (member_id, url) values ('${id}', 'https://instagram.com/reel/9/')`);
  await db.exec("update public.member_access set free_until = now() - interval '1 day' where email = 'ins@example.com'");
  assert.equal((await attempt(db, P.ins, "select access_ok from public.my_access()")).rows[0].access_ok, false);
  assert.equal((await attempt(db, P.ins, "select public.my_numbers() as n")).rows[0].n, null);
  assert.equal((await attempt(db, P.ins, "select * from public.insider_reels")).rows.length, 0);
  assert.equal((await attempt(db, P.ins, `insert into public.insider_reels (member_id, url) values ('${id}', 'https://instagram.com/reel/10/')`)).ok, false);
  assert.equal((await db.query("select count(*)::int as n from public.insider_reels where member_id = $1", [id])).rows[0].n, 2); // kept (both reels)
  await db.exec("update public.member_access set paid_until = now() + interval '30 days' where email = 'ins@example.com'");
  assert.equal((await attempt(db, P.ins, "select access_ok from public.my_access()")).rows[0].access_ok, true);
  assert.notEqual((await attempt(db, P.ins, "select public.my_numbers() ->> 'paid_until' as p")).rows[0].p, null);
});

test("Decline pauses a member (nothing deleted); the owner can change a free period; staff cannot", async () => {
  await commitAs(P.main, "update public.applications set status = 'Declined' where email = 'par@example.com'");
  assert.equal((await attempt(db, P.par, "select * from public.my_access()")).rows.length, 0);
  assert.equal((await db.query("select count(*)::int as n from public.member_access where email = 'par@example.com' and status = 'paused'")).rows[0].n, 1);
  const id = (await db.query("select id from public.member_access where email = 'ins2@example.com'")).rows[0].id;
  assert.equal((await attempt(db, P.staff, `select public.set_free_period('${id}', 12)`)).ok, false);
  assert.equal((await attempt(db, P.main, `select public.set_free_period('${id}', 12)`)).ok, true);
});

test("one email cannot be both an Insider and a Partner", async () => {
  await db.exec(`insert into public.applications (kind, contact_name, email, phone, business_name, business_type, instagram, emirate, branches, trade_licence_path, accepted_terms_at, accepted_privacy_at, accepted_confidentiality_at)
    values ('partner', 'X', 'ins@example.com', '12345678', 'B', 'Shop', 'b', 'Dubai', 1, 'pending/${U(3)}/licence.pdf', now(), now(), now())`);
  await assert.rejects(commitAs(P.main, "update public.applications set status = 'Approved' where email = 'ins@example.com' and kind = 'partner'"), /different kind/);
});
