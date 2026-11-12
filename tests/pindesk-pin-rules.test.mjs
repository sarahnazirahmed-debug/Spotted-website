// Stage 2: who may add, edit and pin a reel. Only the primary owner may pin. Tested on a real (in-memory) database.
import test from "node:test";
import assert from "node:assert/strict";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const reel = (key, status = "to_check") => [
  "insert into public.reels (url, link_key, platform, status) values ($1, $2, 'instagram', $3) returning id",
  [`https://www.instagram.com/reel/${key}/`, `instagram/${key}`, status],
];

async function setup() {
  const db = await makeDb();
  const me = {};
  for (const [k, email, name, role] of [["owner", "sarah@example.com", "Sarah", "main_admin"], ["assoc", "muhammad@example.com", "Muhammad", "associate"], ["h1", "h1@example.com", "Helper One", "helper"], ["h2", "h2@example.com", "Helper Two", "helper"]]) {
    me[k] = { id: await addUser(db, email), email };
    await db.query("insert into public.team_members (email, name, role) values ($1,$2,$3)", [email, name, role]);
  }
  me.outsider = { id: await addUser(db, "nobody@example.com"), email: "nobody@example.com" };
  await db.exec("insert into public.approved_staff (email, is_primary_owner) values ('sarah@example.com', true), ('muhammad@example.com', false)");
  return { db, me };
}

test("a team member can add a reel as to_check or skip, but not as pinned", async () => {
  const { db, me } = await setup();
  assert.equal((await attempt(db, me.h1, ...reel("aaa1"))).ok, true);
  assert.equal((await attempt(db, me.h1, ...reel("aaa2", "skip"))).ok, true);
  assert.equal((await attempt(db, me.h1, ...reel("aaa3", "pinned"))).ok, false);
  assert.equal((await attempt(db, me.assoc, ...reel("aaa4", "pinned"))).ok, false, "not even an associate");
});

test("nobody who is not signed in, or not on the team, can read or change reels", async () => {
  const { db, me } = await setup();
  assert.equal((await attempt(db, null, "select * from public.reels")).ok, false);
  assert.equal((await attempt(db, null, ...reel("bbb1"))).ok, false);
  assert.equal((await attempt(db, me.outsider, ...reel("bbb2"))).ok, false);
  const seen = await attempt(db, me.outsider, "select * from public.reels");
  assert.equal(seen.rows?.length ?? 0, 0);
});

test("a team member edits only reels they added", async () => {
  const { db, me } = await setup();
  await db.exec("insert into public.reels (url, link_key, platform, status, added_by) values ('https://www.instagram.com/reel/ccc1/','instagram/ccc1','instagram','to_check','Helper One'), ('https://www.instagram.com/reel/ccc2/','instagram/ccc2','instagram','to_check','Helper Two')");
  const mine = await attempt(db, me.h1, "update public.reels set notes='hi' where link_key='instagram/ccc1'");
  assert.equal(mine.affected, 1);
  const theirs = await attempt(db, me.h1, "update public.reels set notes='hi' where link_key='instagram/ccc2'");
  assert.equal(theirs.affected ?? 0, 0, "someone else's reel is untouched");
  const adminOnOthers = await attempt(db, me.assoc, "update public.reels set notes='hi' where link_key='instagram/ccc1'");
  assert.equal(adminOnOthers.affected ?? 0, 0, "an associate edits only their own, too");
});

test("only the primary owner can set a reel to pinned", async () => {
  const { db, me } = await setup();
  await db.exec("insert into public.reels (url, link_key, platform, status, added_by, place_name, lat, lng) values ('https://www.instagram.com/reel/ddd1/','instagram/ddd1','instagram','to_check','Helper One','Cafe',24.4,54.4)");
  const sql = "update public.reels set status='pinned' where link_key='instagram/ddd1'";
  assert.equal((await attempt(db, me.h1, sql)).ok, false, "the person who added it cannot pin it");
  assert.equal((await attempt(db, me.assoc, sql)).affected ?? 0, 0);
  const owner = await attempt(db, me.owner, sql);
  assert.equal(owner.ok, true);
  assert.equal(owner.affected, 1);
});

test("once pinned, a helper cannot change or un-pin it, but Sarah can", async () => {
  const { db, me } = await setup();
  await db.exec("insert into public.reels (url, link_key, platform, status, added_by, place_name, lat, lng) values ('https://www.instagram.com/reel/eee1/','instagram/eee1','instagram','pinned','Helper One','Cafe',24.4,54.4)");
  assert.equal((await attempt(db, me.h1, "update public.reels set status='skip' where link_key='instagram/eee1'")).affected ?? 0, 0);
  assert.equal((await attempt(db, me.owner, "update public.reels set status='skip' where link_key='instagram/eee1'")).affected, 1);
});

test("the old rules stay: https only, and the same link cannot be added twice", async () => {
  const { db, me } = await setup();
  assert.equal((await attempt(db, me.h1, "insert into public.reels (url, link_key, platform) values ('http://x.com/a','instagram/fff1','instagram')")).ok, false);
  assert.equal((await attempt(db, me.h1, ...reel("ggg1"))).ok, true);
  await db.exec("insert into public.reels (url, link_key, platform, status) values ('https://www.instagram.com/reel/ggg2/','instagram/ggg2','instagram','to_check')");
  assert.equal((await attempt(db, me.h1, ...reel("ggg2"))).ok, false);
});

test("the dashboard hides the Pin button and the Pinned choice from everyone but the main admin (Sarah)", async () => {
  const { readFileSync } = await import("node:fs");
  const { canPinReels } = await import("../src/lib/teamRules.ts");
  assert.equal(canPinReels("main_admin"), true);
  for (const r of ["associate", "staff", "helper", null]) assert.equal(canPinReels(r), false, String(r));
  assert.match(readFileSync("src/components/admin/PinDesk.tsx", "utf8"), /canPinReels\(me\?\.role \?\? null\)/);
  assert.match(readFileSync("src/components/admin/ReelForm.tsx", "utf8"), /!mayPin/);
});

test("Pin Desk: has an Added by filter, and a plain message on phones (the desk itself shows only on laptops)", async () => {
  const { readFileSync } = await import("node:fs");
  const desk = readFileSync("src/components/admin/PinDesk.tsx", "utf8");
  assert.match(desk, /aria-label="Added by"/);
  assert.match(desk, /addedBy && r\.added_by !== addedBy/);
  const page = readFileSync("src/app/admin/pin/page.tsx", "utf8");
  assert.match(page, /lg:hidden/);
  assert.match(page, /hidden lg:block/);
  assert.match(page, /laptop or a desktop/);
});
