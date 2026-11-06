// Tests for supabase/dashboard.sql on a real in-memory Postgres: who may ask, and that the numbers are right.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {};
before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", assoc: "assoc@example.com", staff: "staff@example.com", helper: "helper@example.com", user: "user@example.com", inf1: "inf1@example.com", inf2: "inf2@example.com" })) {
    P[k] = { id: await addUser(db, email), email };
  }
  await db.exec(`
    insert into public.team_members (email, name, role) values
      ('main@example.com','Main','main_admin'), ('assoc@example.com','Assoc','associate'),
      ('staff@example.com','Staff','staff'), ('helper@example.com','Helper','helper');
    update public.profiles set country = 'AE', created_at = now() - interval '1 day' where email = 'main@example.com' or id = '${P.main.id}';
    update public.profiles set country = 'AE' where id = '${P.assoc.id}';
    update public.profiles set country = 'SA' where id = '${P.staff.id}';
    insert into public.partner_accounts (owner_id, kind, business_name, handle, status, country, trial_started_at) values
      ('${P.inf1.id}', 'influencer', 'Creator One', '@one', 'trial', 'AE', now() - interval '10 days'),
      ('${P.inf2.id}', 'influencer', 'Creator Two', '@two', 'active', 'SA', now() - interval '100 days');
    insert into public.reels (url, link_key, platform, creator_handle) values
      ('https://www.instagram.com/reel/A/', 'instagram/A', 'instagram', '@one'),
      ('https://www.instagram.com/reel/B/', 'instagram/B', 'instagram', '@ONE'),
      ('https://www.instagram.com/reel/C/', 'instagram/C', 'instagram', '@two'),
      ('https://www.instagram.com/reel/D/', 'instagram/D', 'instagram', null);
    insert into public.places (partner_id, kind, name, area, emirate, category)
      select id, 'restaurant', 'Cafe', 'Khalifa City', 'Abu Dhabi', 'Eat' from public.partner_accounts where handle = '@one';
    insert into public.stars (place_id, creator_id, kind)
      select p.id, a.id, k.kind::star_kind from public.places p, public.partner_accounts a,
        (values ('yellow'), ('purple'), ('green'), ('green')) as k(kind) where a.handle = '@one';
  `);
});

const real = (who, country = "ALL") => attempt(db, who, "select metric, day, value from public.dashboard_real($1, 400)", [country]);
const total = (rows, metric) => rows.filter((r) => r.metric === metric).reduce((n, r) => n + Number(r.value), 0);

test("logged-out visitors, non-members and helpers cannot ask for dashboard numbers", async () => {
  assert.equal((await real(null)).ok, false);
  assert.equal((await real(P.user)).ok, false);
  assert.equal((await real(P.helper)).ok, false);
  assert.equal((await attempt(db, P.helper, "select * from public.dashboard_influencers()")).ok, false);
  assert.equal((await attempt(db, P.user, "select * from public.dashboard_influencers()")).ok, false);
});

test("the main admin, associates and staff can", async () => {
  for (const who of [P.main, P.assoc, P.staff]) {
    assert.equal((await real(who)).ok, true, who.email);
    assert.equal((await attempt(db, who, "select * from public.dashboard_influencers()")).ok, true);
  }
});

test("worldwide numbers count everything that exists", async () => {
  const r = (await real(P.staff)).rows;
  assert.equal(total(r, "signups"), 7);
  assert.equal(total(r, "influencers_joined"), 2);
  assert.equal(total(r, "trials_started"), 2);
  assert.equal(total(r, "reels_linked"), 3); // the reel with no creator does not count
  assert.equal(total(r, "visits"), 3); // 1 purple + 2 green (the yellow star is a save, not a visit)
});

test("the country filter narrows the numbers", async () => {
  const ae = (await real(P.main, "AE")).rows;
  assert.equal(total(ae, "signups"), 2);
  assert.equal(total(ae, "influencers_joined"), 1);
  assert.equal(total(ae, "reels_linked"), 2);
  assert.equal(total(ae, "visits"), 3);
  const sa = (await real(P.main, "SA")).rows;
  assert.equal(total(sa, "influencers_joined"), 1);
  assert.equal(total(sa, "reels_linked"), 1);
  assert.equal(total(sa, "visits"), 0);
  assert.equal((await real(P.main, "ZZ")).rows.length, 0);
});

test("trials ending are 2 months after they start, for creators still on trial", async () => {
  const r = (await real(P.main)).rows.filter((x) => x.metric === "trials_ending");
  assert.equal(r.length, 1); // only Creator One is still on trial
  const days = (new Date(r[0].day) - new Date()) / 864e5;
  assert.ok(days > 40 && days < 60, `ends in ${days} days`);
});

test("per Insider: reels (not caring about capital letters), visits and saves", async () => {
  const r = (await attempt(db, P.assoc, "select name, reels, visits, saves from public.dashboard_influencers() order by name")).rows;
  assert.deepEqual(r.map((x) => [x.name, Number(x.reels), Number(x.visits), Number(x.saves)]), [
    ["Creator One", 2, 3, 1],
    ["Creator Two", 1, 0, 0],
  ]);
});

test("the numbers carry no money and no personal details", async () => {
  const r = await real(P.staff);
  assert.deepEqual(Object.keys(r.rows[0]).sort(), ["day", "metric", "value"]);
  const i = await attempt(db, P.staff, "select * from public.dashboard_influencers()");
  assert.deepEqual(Object.keys(i.rows[0]).sort(), ["handle", "id", "joined", "name", "reels", "saves", "visits"]);
});
