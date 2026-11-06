// Tests for the privacy rules in supabase/admin.sql, run on a REAL (in-memory) Postgres database.
// Each test pretends to be a different person, then everything is undone.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, as, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {}; // the people: { id, email }

before(async () => {
  db = await makeDb();
  for (const [key, email] of Object.entries({
    main: "main@example.com",
    assoc: "assoc@example.com",
    assoc2: "assoc2@example.com",
    staff: "staff@example.com",
    helper: "helper@example.com",
    outsider: "outsider@example.com", // has an account but is NOT on the team
    newbie: "newbie@example.com",
  })) {
    P[key] = { id: await addUser(db, email), email };
  }
  // The team, set up the way you will do it in the SQL Editor.
  await db.exec(`
    insert into public.team_members (email, name, role) values
      ('main@example.com', 'Main Admin', 'main_admin'),
      ('assoc@example.com', 'Associate One', 'associate'),
      ('assoc2@example.com', 'Associate Two', 'associate'),
      ('staff@example.com', 'Staff Person', 'staff'),
      ('helper@example.com', 'Helper Person', 'helper');
    insert into public.reels (url, link_key, platform, place_name, status)
      values ('https://www.instagram.com/reel/AAA/', 'instagram/AAA', 'instagram', 'Seed Cafe', 'to_check');
    insert into public.share_requests (link_key, url, platform, times_shared)
      values ('instagram/BBB', 'https://www.instagram.com/reel/BBB/', 'instagram', 5);
    insert into public.earnings (member_email, amount_aed) values ('staff@example.com', 100);
  `);
});

const reelSql = (key, extra = "") =>
  `insert into public.reels (url, link_key, platform ${extra ? ", " + extra.split("|")[0] : ""}) values ('https://www.instagram.com/reel/${key}/', 'instagram/${key}', 'instagram' ${extra ? ", " + extra.split("|")[1] : ""})`;

// ---------------------------------------------------------------- logged-out and non-members
test("a logged-out visitor sees nothing, and cannot add anything", async () => {
  for (const table of ["reels", "share_requests", "team_members", "team_log", "earnings", "waiting_requests"]) {
    const r = await attempt(db, null, `select * from public.${table}`);
    assert.equal(r.ok ? r.rows.length : 0, 0, `${table} leaked to a logged-out visitor`);
  }
  assert.equal((await attempt(db, null, reelSql("ZZZ"))).ok, false);
  assert.equal((await attempt(db, null, "select public.whoami()")).ok, false);
});

test("a person with an account who is NOT on the team sees nothing", async () => {
  for (const table of ["reels", "share_requests", "team_members", "team_log", "earnings", "waiting_requests"]) {
    const r = await attempt(db, P.outsider, `select * from public.${table}`);
    assert.equal(r.ok ? r.rows.length : 0, 0, `${table} leaked to a non-member`);
  }
  assert.equal((await attempt(db, P.outsider, reelSql("ZZZ"))).ok, false, "a non-member added a reel");
  const me = await attempt(db, P.outsider, "select * from public.whoami()");
  assert.equal(me.rows.length, 0, "a non-member was told they have a role");
});

test("app users never read reels directly (but can record a share)", async () => {
  const read = await attempt(db, P.outsider, "select * from public.reels");
  assert.equal(read.rows.length, 0);
  const counted = await as(db, P.outsider, async (d) => {
    await d.query("select public.record_share('instagram/NEW1', 'https://www.instagram.com/reel/NEW1/', 'instagram')");
    await d.query("select public.record_share('instagram/NEW1', 'https://www.instagram.com/reel/NEW1/', 'instagram')");
    const readBack = await d.query("select times_shared from public.share_requests");
    await d.exec("reset role"); // now look as the owner of the database, to check that it was counted twice
    const real = await d.query("select times_shared from public.share_requests where link_key = 'instagram/NEW1'");
    return { readBack: readBack.rows.length, times: real.rows[0].times_shared };
  });
  assert.equal(counted.readBack, 0, "an app user could read share_requests back");
  assert.equal(counted.times, 2, "the second share was not counted");
});

// ---------------------------------------------------------------- the team
test("a helper cannot open Team (cannot read, add, change or remove people)", async () => {
  assert.equal((await attempt(db, P.helper, "select * from public.team_members")).rows.length, 0);
  assert.equal((await attempt(db, P.helper, "select * from public.team_log")).rows.length, 0);
  assert.equal(
    (await attempt(db, P.helper, "insert into public.team_members (email, name, role) values ('x@example.com', 'X', 'helper')")).ok,
    false,
  );
  const upd = await attempt(db, P.helper, "update public.team_members set role = 'associate' where email = 'helper@example.com'");
  assert.equal(upd.ok && upd.affected > 0, false);
  const del = await attempt(db, P.helper, "delete from public.team_members where email = 'staff@example.com'");
  assert.equal(del.ok && del.affected > 0, false);
});

test("staff cannot open Team either", async () => {
  assert.equal((await attempt(db, P.staff, "select * from public.team_members")).rows.length, 0);
});

test("staff cannot see earnings, but the main admin and associates can", async () => {
  assert.equal((await attempt(db, P.staff, "select * from public.earnings")).rows.length, 0);
  assert.equal((await attempt(db, P.helper, "select * from public.earnings")).rows.length, 0);
  assert.equal((await attempt(db, P.main, "select * from public.earnings")).rows.length, 1);
  assert.equal((await attempt(db, P.assoc, "select * from public.earnings")).rows.length, 1);
  assert.equal((await attempt(db, P.assoc, "insert into public.earnings (member_email, amount_aed) values ('x@example.com', 5)")).ok, false);
});

test("an associate cannot add an associate, but can add staff and helpers", async () => {
  const bad = await attempt(db, P.assoc, "insert into public.team_members (email, name, role) values ('new@example.com', 'New', 'associate')");
  assert.equal(bad.ok, false, "an associate added an associate");
  const worse = await attempt(db, P.assoc, "insert into public.team_members (email, name, role) values ('new@example.com', 'New', 'main_admin')");
  assert.equal(worse.ok, false, "an associate added a main admin");
  assert.equal((await attempt(db, P.assoc, "insert into public.team_members (email, name, role) values ('new@example.com', 'New', 'staff')")).ok, true);
  assert.equal((await attempt(db, P.assoc, "insert into public.team_members (email, name, role) values ('new2@example.com', 'New', 'helper')")).ok, true);
});

test("the main admin can add an associate", async () => {
  assert.equal((await attempt(db, P.main, "insert into public.team_members (email, name, role) values ('a3@example.com', 'A3', 'associate')")).ok, true);
});

test("an associate cannot change or remove another associate", async () => {
  const upd = await attempt(db, P.assoc, "update public.team_members set role = 'staff' where email = 'assoc2@example.com'");
  assert.equal(upd.ok && upd.affected > 0, false);
  const del = await attempt(db, P.assoc, "delete from public.team_members where email = 'assoc2@example.com'");
  assert.equal(del.ok && del.affected > 0, false);
});

test("an associate cannot promote a helper to associate, but can change staff and helper", async () => {
  const up = await attempt(db, P.assoc, "update public.team_members set role = 'associate' where email = 'helper@example.com'");
  assert.equal(up.ok && up.affected > 0, false);
  const ok = await attempt(db, P.assoc, "update public.team_members set role = 'staff' where email = 'helper@example.com'");
  assert.equal(ok.ok && ok.affected, 1);
  const rm = await attempt(db, P.assoc, "delete from public.team_members where email = 'helper@example.com'");
  assert.equal(rm.ok && rm.affected, 1);
});

test("the main admin can change and remove associates", async () => {
  assert.equal((await attempt(db, P.main, "update public.team_members set role = 'staff' where email = 'assoc2@example.com'")).affected, 1);
  assert.equal((await attempt(db, P.main, "delete from public.team_members where email = 'assoc2@example.com'")).affected, 1);
});

test("NOBODY can remove the main admin", async () => {
  for (const who of [P.main, P.assoc, P.staff, P.helper]) {
    const r = await attempt(db, who, "delete from public.team_members where role = 'main_admin'");
    assert.equal(r.ok && r.affected > 0, false, `${who.email} removed the main admin`);
  }
  // even the person who owns the database (the SQL Editor) is stopped by the lock
  await assert.rejects(db.exec("delete from public.team_members where role = 'main_admin'"), /main admin cannot be removed/);
  const still = await db.query("select count(*)::int as n from public.team_members where role = 'main_admin'");
  assert.equal(still.rows[0].n, 1);
});

test("NOBODY can change the main admin, or make someone else main admin", async () => {
  for (const sql of [
    "update public.team_members set role = 'staff' where role = 'main_admin'",
    "update public.team_members set active = false where role = 'main_admin'",
    "update public.team_members set email = 'other@example.com' where role = 'main_admin'",
  ]) {
    for (const who of [P.main, P.assoc]) {
      const r = await attempt(db, who, sql);
      assert.equal(r.ok && r.affected > 0, false, `${who.email} changed the main admin: ${sql}`);
    }
    await assert.rejects(db.exec(sql), /main admin cannot be changed/);
  }
  await assert.rejects(db.exec("update public.team_members set role = 'main_admin' where email = 'staff@example.com'"), /Nobody can be made the main admin/);
  const r = await attempt(db, P.main, "update public.team_members set role = 'main_admin' where email = 'staff@example.com'");
  assert.equal(r.ok && r.affected > 0, false);
});

test("there can only ever be ONE main admin", async () => {
  await assert.rejects(db.exec("insert into public.team_members (email, name, role) values ('second@example.com', 'Second', 'main_admin')"), /unique|duplicate/i);
});

test("every add, change and remove is written to the log, with who did it", async () => {
  const log = await as(db, P.main, async (d) => {
    await d.query("insert into public.team_members (email, name, role) values ('logme@example.com', 'Log Me', 'staff')");
    await d.query("update public.team_members set role = 'helper' where email = 'logme@example.com'");
    await d.query("delete from public.team_members where email = 'logme@example.com'");
    return d.query("select action, actor_email, target_email, detail from public.team_log where target_email = 'logme@example.com' order by id");
  });
  assert.deepEqual(log.rows.map((r) => r.action), ["added", "changed", "removed"]);
  assert.ok(log.rows.every((r) => r.actor_email === "main@example.com"));
  assert.match(log.rows[1].detail, /staff to helper/);
});

test("the log cannot be edited or cleared by anyone on the website", async () => {
  for (const who of [P.main, P.assoc]) {
    for (const sql of ["delete from public.team_log", "update public.team_log set action = 'added'", "insert into public.team_log (action, target_email) values ('added', 'x')"]) {
      const r = await attempt(db, who, sql);
      assert.equal(r.ok && (r.affected ?? 0) > 0, false, `${who.email} could do: ${sql}`);
    }
  }
});

test("who added a person is filled in by the database and cannot be faked", async () => {
  const r = await as(db, P.assoc, async (d) => {
    await d.query("insert into public.team_members (email, name, role, added_by, agreed_confidentiality_at, active) values ('fake@example.com', 'Fake', 'staff', 'Someone Else', now(), false)");
    return d.query("select added_by, agreed_confidentiality_at, active from public.team_members where email = 'fake@example.com'").catch(() => null);
  });
  // the associate can read the team, so the row is visible
  assert.equal(r.rows[0].added_by, "Associate One");
  assert.equal(r.rows[0].agreed_confidentiality_at, null);
  assert.equal(r.rows[0].active, true);
});

test("whoami links the account, and the confidentiality tick is saved once", async () => {
  const me = await as(db, P.staff, async (d) => {
    const a = await d.query("select * from public.whoami()");
    await d.query("select public.agree_confidentiality()");
    const b = await d.query("select * from public.whoami()");
    return { first: a.rows[0], second: b.rows[0] };
  });
  assert.equal(me.first.role, "staff");
  assert.equal(me.first.agreed_confidentiality_at, null);
  assert.ok(me.second.agreed_confidentiality_at);
});

// ---------------------------------------------------------------- reels and share requests
test("all four roles can use reels and share requests", async () => {
  for (const who of [P.main, P.assoc, P.staff, P.helper]) {
    const r = await as(db, who, async (d) => {
      await d.query(reelSql("R" + who.email.slice(0, 3)));
      await d.query("update public.reels set notes = 'checked' where link_key = 'instagram/AAA'");
      await d.query("insert into public.share_requests (link_key, url, platform) values ('instagram/S" + who.email.slice(0, 3) + "', 'https://www.instagram.com/reel/x/', 'instagram')");
      const reels = await d.query("select * from public.reels");
      const shares = await d.query("select * from public.share_requests");
      return { reels: reels.rows.length, shares: shares.rows.length };
    });
    assert.ok(r.reels >= 2, `${who.email} could not use reels`);
    assert.ok(r.shares >= 2, `${who.email} could not use share requests`);
  }
});

test("only the main admin and associates delete reels", async () => {
  assert.equal((await attempt(db, P.staff, "delete from public.reels where link_key = 'instagram/AAA'")).affected, 0);
  assert.equal((await attempt(db, P.helper, "delete from public.reels where link_key = 'instagram/AAA'")).affected, 0);
  assert.equal((await attempt(db, P.assoc, "delete from public.reels where link_key = 'instagram/AAA'")).affected, 1);
});

test("added_by and pinned_by are filled in by the database", async () => {
  const r = await as(db, P.helper, async (d) => {
    await d.query("insert into public.reels (url, link_key, platform, place_name, lat, lng, status, added_by, pinned_by) values ('https://www.instagram.com/reel/P1/', 'instagram/P1', 'instagram', 'Pin Place', 25.2, 55.3, 'pinned', 'Fake', 'Fake')");
    return d.query("select added_by, pinned_by from public.reels where link_key = 'instagram/P1'");
  });
  assert.equal(r.rows[0].added_by, "Helper Person");
  assert.equal(r.rows[0].pinned_by, "Helper Person");
});

test("a reel cannot be Pinned without a place name and a pin on the map", async () => {
  const noPin = await attempt(db, P.staff, "update public.reels set status = 'pinned' where link_key = 'instagram/AAA'");
  assert.equal(noPin.ok, false, "pinned without a pin");
  const noName = await attempt(db, P.staff, "update public.reels set status = 'pinned', lat = 25, lng = 55, place_name = '  ' where link_key = 'instagram/AAA'");
  assert.equal(noName.ok, false, "pinned without a place name");
  const ok = await attempt(db, P.staff, "update public.reels set status = 'pinned', lat = 25, lng = 55 where link_key = 'instagram/AAA'");
  assert.equal(ok.ok, true);
});

test("the same link cannot be added twice", async () => {
  const dup = await attempt(db, P.staff, reelSql("AAA"));
  assert.equal(dup.ok, false);
  assert.match(dup.error, /duplicate|unique/i);
});

test("a reel can have at most 9 dishes, each with a name and an AED price", async () => {
  const nine = JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ name: "Dish " + i, price_aed: 10 + i })));
  const ten = JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ name: "Dish " + i, price_aed: 10 + i })));
  const ins = (d) => `insert into public.reels (url, link_key, platform, dishes) values ('https://www.instagram.com/reel/D1/', 'instagram/D1', 'instagram', '${d}'::jsonb)`;
  assert.equal((await attempt(db, P.staff, ins(nine))).ok, true);
  assert.equal((await attempt(db, P.staff, ins(ten))).ok, false);
  assert.equal((await attempt(db, P.staff, ins('[{"name":"No price"}]'))).ok, false);
  assert.equal((await attempt(db, P.staff, ins('[{"name":"Negative","price_aed":-1}]'))).ok, false);
});

test("Waiting shows shared links that are not pinned yet, most shared first", async () => {
  await db.exec(`
    insert into public.share_requests (link_key, url, platform, times_shared) values
      ('instagram/W1', 'https://www.instagram.com/reel/W1/', 'instagram', 2),
      ('instagram/W2', 'https://www.instagram.com/reel/W2/', 'instagram', 9),
      ('instagram/W3', 'https://www.instagram.com/reel/W3/', 'instagram', 4);
    insert into public.reels (url, link_key, platform, place_name, lat, lng, status)
      values ('https://www.instagram.com/reel/W3/', 'instagram/W3', 'instagram', 'Done', 1, 1, 'pinned');
  `);
  try {
    const r = await attempt(db, P.helper, "select link_key from public.waiting_requests where link_key in ('instagram/W1','instagram/W2','instagram/W3') order by times_shared desc");
    assert.deepEqual(r.rows.map((x) => x.link_key), ["instagram/W2", "instagram/W1"]);
    assert.equal((await attempt(db, P.outsider, "select * from public.waiting_requests")).rows.length, 0);
  } finally {
    await db.exec("delete from public.reels where link_key = 'instagram/W3'; delete from public.share_requests where link_key like 'instagram/W%'");
  }
});
