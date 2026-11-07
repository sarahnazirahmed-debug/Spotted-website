// Tests for Step 7: the upgraded Add reel form.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { locationFits, locationGroups, postedOnProblem } from "../src/lib/reelPlace.ts";
import { readReelLink } from "../src/lib/reelLinks.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const loc = (o) => ({ id: "x", name: "N", emirate: null, maps_url: null, lat: null, lng: null, is_building: false, business_id: null, ...o });

test("Posted on is needed when there are items or a deal, and never in the future", () => {
  const today = "2026-11-07";
  assert.equal(postedOnProblem({ dishCount: 0, dealCount: 0, postedOn: "" }, today), null);
  assert.match(postedOnProblem({ dishCount: 1, dealCount: 0, postedOn: "" }, today), /Posted on/);
  assert.match(postedOnProblem({ dishCount: 0, dealCount: 1, postedOn: "" }, today), /Posted on/);
  assert.equal(postedOnProblem({ dishCount: 1, dealCount: 0, postedOn: "2026-11-01" }, today), null);
  assert.match(postedOnProblem({ dishCount: 0, dealCount: 0, postedOn: "2026-12-01" }, today), /future/);
  assert.match(postedOnProblem({ dishCount: 0, dealCount: 0, postedOn: "2001-01-01" }, today), /long ago/);
});

test("location choices: its own, then free malls and hotels; none chosen shows all", () => {
  const list = [
    loc({ id: "a", name: "Cafe Yas", business_id: "b1" }),
    loc({ id: "m", name: "Yas Mall", is_building: true }),
    loc({ id: "o", name: "Other cafe", business_id: "b2" }),
    loc({ id: "om", name: "Other's mall", is_building: true, business_id: "b2" }),
  ];
  const g = locationGroups("b1", list);
  assert.deepEqual(g.map((x) => x.items.map((i) => i.id)), [["a"], ["m"]]);
  assert.equal(locationGroups("", list)[0].items.length, 4);
  assert.equal(locationFits(list[2], "b1"), false);
  assert.equal(locationFits(list[2], ""), true);
  assert.equal(locationFits(list[1], "b1"), true);
});

test("link cleaning is still there", () => {
  const r = readReelLink("https://www.instagram.com/reel/ABC123/?igsh=xyz");
  assert.equal(r.ok, true);
  assert.equal(r.linkKey, "instagram/ABC123");
});

test("the form links a restaurant or shop, a location, a date and keeps the creator team-only", () => {
  const f = readFileSync("src/components/admin/ReelForm.tsx", "utf8");
  for (const t of ["business_id", "location_id", "posted_on", "Create a new restaurant or shop", "locationGroups", "team only"]) assert.ok(f.includes(t), t);
  assert.doesNotMatch(f, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(f, /\p{Extended_Pictographic}/u);
  const desk = readFileSync("src/components/admin/PinDesk.tsx", "utf8");
  assert.match(desk, /Reel code: /);
  assert.match(desk, /\.insert\(values\)\.select\("id, code"\)/);
});

test("a reel saves with a restaurant, a location, both or neither; a mismatch is refused; a code is made", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "main@example.com"), email: "main@example.com" };
  await db.exec(`insert into public.team_members (email, name, role) values ('main@example.com','Main','main_admin');
    insert into public.businesses (name, type) values ('Cafe A','restaurant'), ('Cafe B','restaurant');
    insert into public.locations (name, business_id) select 'A Yas', id from public.businesses where name = 'Cafe A';`);
  const ins = (extra, n) => attempt(db, who,
    `insert into public.reels (url, link_key, platform, business_id, location_id, posted_on)
     values ('https://www.instagram.com/reel/${n}/', 'instagram/${n}', 'instagram', ${extra}) returning code`);
  const both = await ins(`(select id from public.businesses where name='Cafe A'), (select id from public.locations where name='A Yas'), '2026-10-01'`, "R1");
  assert.ok(both.ok, both.error);
  assert.match(both.rows[0].code, /^[A-HJ-NP-Z]{8}[2-9]{8}$/);
  assert.ok((await ins(`null, (select id from public.locations where name='A Yas'), null`, "R2")).ok);
  assert.ok((await ins(`(select id from public.businesses where name='Cafe B'), null, null`, "R3")).ok);
  assert.ok((await ins(`null, null, null`, "R4")).ok);
  const bad = await ins(`(select id from public.businesses where name='Cafe B'), (select id from public.locations where name='A Yas'), null`, "R5");
  assert.equal(bad.ok, false);
});
