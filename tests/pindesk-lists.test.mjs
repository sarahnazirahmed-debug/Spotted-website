// Tests for Step 9: the three lists, the edit pages and the change log.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { businessComplete, describeChange, matches, newestFirst, niceDateTime, yesNo } from "../src/lib/listRules.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

test("newest on top, yes/no words, search words", () => {
  const rows = [{ created_at: "2026-11-01T10:00:00Z", n: "a" }, { created_at: "2026-11-07T09:00:00Z", n: "b" }, { created_at: "2026-10-01T00:00:00Z", n: "c" }];
  assert.deepEqual(newestFirst(rows).map((r) => r.n), ["b", "a", "c"]);
  assert.equal(yesNo(true), "Yes");
  assert.equal(yesNo(false), "No");
  assert.ok(matches("Cafe Noor KQXM4729 sarah", "noor kqxm"));
  assert.ok(!matches("Cafe Noor", "pizza"));
  assert.match(niceDateTime("2026-11-07T14:35:00Z"), /Nov 2026/);
});

test("complete = kind, Instagram, email and WhatsApp each filled in or marked not needed", () => {
  const full = { subtype: "Cafe", instagram_handle: "a", business_email: "a@b.ae", business_whatsapp: "+971501234567", not_needed: {} };
  assert.equal(businessComplete(full), true);
  assert.equal(businessComplete({ ...full, business_email: null }), false);
  assert.equal(businessComplete({ ...full, business_email: null, not_needed: { business_email: true } }), true);
  assert.equal(businessComplete({ ...full, instagram_handle: "  " }), false);
  assert.equal(businessComplete({ subtype: null, instagram_handle: null, business_email: null, business_whatsapp: null, not_needed: { subtype: true, instagram_handle: true, business_email: true, business_whatsapp: true } }), true);
  assert.equal(businessComplete({ ...full, not_needed: null }), true);
});

test("history lines say what changed", () => {
  assert.equal(describeChange({ action: "added", label: "Cafe Noor", changes: {} }, "businesses"), 'Added restaurant or shop "Cafe Noor"');
  assert.equal(describeChange({ action: "removed", label: "Feast", changes: {} }, "reel_deals"), 'Removed deal "Feast"');
  assert.match(describeChange({ action: "changed", label: "Cafe", changes: { business_email: { from: null, to: "a@b.ae" } } }, "businesses"), /business email: \(empty\) to a@b\.ae/);
});

test("every list has a page and an edit page, and the home page links to them", () => {
  for (const d of ["locations", "restaurants", "reels"]) {
    assert.ok(existsSync(`src/app/admin/${d}/page.tsx`), d);
    assert.ok(existsSync(`src/app/admin/${d}/edit/page.tsx`), `${d}/edit`);
  }
  const home = readFileSync("src/components/admin/PinDeskHome.tsx", "utf8");
  for (const h of ["/admin/locations", "/admin/restaurants", "/admin/reels"]) assert.ok(home.includes(h), h);
});

test("the lists show the columns that were asked for, and never send Added by", () => {
  const l = readFileSync("src/components/admin/AdminLists.tsx", "utf8");
  for (const t of ["Linked to a restaurant or shop", "Mall or hotel", "Single", "Has a reel", "Has a location", "Instagram handle", "Linked place", "Posted on", "Has a deal", "Added by", "ticked: businessComplete"]) assert.ok(l.includes(t), t);
  assert.match(l, /order\("created_at", \{ ascending: false \}\)/);
  for (const f of ["BusinessEdit", "LocationEdit", "ReelEdit"]) {
    const src = readFileSync(`src/components/admin/${f}.tsx`, "utf8");
    assert.match(src, /ChangeHistory/, f);
    for (const m of src.matchAll(/\.(?:update|insert)\(\{([\s\S]*?)\}\)/g)) assert.doesNotMatch(m[1], /added_by|changed_by|\bcode\b/, `${f} must not send added_by, changed_by or a code`);
  }
  for (const f of ["AdminLists", "ListShell", "ChangeHistory", "BusinessEdit", "LocationEdit", "ReelEdit"]) {
    const src = readFileSync(`src/components/admin/${f}.tsx`, "utf8");
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, f);
  }
});

// ---------------------------------------------------------------- the change log, against the real database rules
test("every add, change and removal is logged with who made it; the log cannot be written from the website", async () => {
  const db = await makeDb();
  const sarah = { id: await addUser(db, "sarah@example.com"), email: "sarah@example.com" };
  const user = { id: await addUser(db, "user@example.com"), email: "user@example.com" };
  await db.exec(`insert into public.team_members (email, name, role) values ('sarah@example.com','Sarah','main_admin')`);

  const add = await attempt(db, sarah, "insert into public.businesses (name, type) values ('Cafe Noor','restaurant') returning id");
  assert.ok(add.ok, add.error);
  const id = add.rows[0].id;

  // each step as Sarah, kept (the helper rolls back, so do the steps in one go)
  const steps = await attempt(db, sarah, `
    with b as (insert into public.businesses (name, type) values ('Cafe Two','restaurant') returning id),
    u as (update public.businesses set business_email = 'Hi@Cafe.ae', name = 'Cafe Two Renamed' where id = (select id from b) returning id)
    select (select id from b) as id`);
  assert.ok(steps.ok, steps.error);

  // one connection, several steps: add, change, change nothing, remove
  await db.exec("begin");
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: sarah.id, email: sarah.email, role: "authenticated" })]);
  const b = (await db.query("insert into public.businesses (name, type) values ('Logged Cafe','shop') returning id")).rows[0].id;
  await db.query("update public.businesses set business_email = 'x@y.ae', name = 'Logged Cafe 2' where id = $1", [b]);
  await db.query("update public.businesses set name = 'Logged Cafe 2' where id = $1", [b]); // nothing changed: no line
  const l = (await db.query("insert into public.locations (name) values ('Loc') returning id")).rows[0].id;
  const r = (await db.query("insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/LG1/','instagram/LG1','instagram') returning id")).rows[0].id;
  const deal = (await db.query("insert into public.reel_deals (reel_id, title) values ($1,'Feast') returning id", [r])).rows[0].id;
  await db.query("insert into public.reel_deal_prices (deal_id, people, total_price_aed) values ($1, 2, 120)", [deal]);
  await db.query("delete from public.reel_deals where id = $1", [deal]);
  const log = (await db.query("select table_name, row_id, parent_id, action, label, changes, changed_by from public.change_log order by id")).rows;
  const mine = log.filter((x) => x.row_id === b);
  assert.deepEqual(mine.map((x) => x.action), ["added", "changed"]);
  assert.ok(mine.every((x) => x.changed_by === "Sarah"));
  assert.deepEqual(Object.keys(mine[1].changes).sort(), ["business_email", "name"]);
  assert.equal(mine[1].changes.name.from, "Logged Cafe");
  assert.equal(mine[1].changes.name.to, "Logged Cafe 2");
  assert.ok(log.some((x) => x.table_name === "locations" && x.row_id === l && x.action === "added"));
  assert.ok(log.some((x) => x.table_name === "reels" && x.row_id === r && x.action === "added"));
  const dealLines = log.filter((x) => x.table_name === "reel_deals" && x.row_id === deal);
  assert.deepEqual(dealLines.map((x) => x.action), ["added", "removed"]);
  assert.ok(dealLines.every((x) => x.parent_id === r)); // a reel's page can show its deals' history
  assert.ok(log.some((x) => x.table_name === "reel_deal_prices" && x.parent_id === r)); // the price line belongs to the reel too
  await db.exec("rollback");

  // the website cannot write, change or delete the log
  for (const sql of ["insert into public.change_log (table_name,row_id,action,changed_by) values ('x', gen_random_uuid(), 'added', 'me')", "update public.change_log set changed_by = 'someone else'", "delete from public.change_log"]) {
    const w = await attempt(db, sarah, sql);
    assert.equal(w.ok, false, sql);
  }
  // team can read it; a person who is not on the team and a visitor cannot
  assert.ok((await attempt(db, sarah, "select * from public.change_log")).ok);
  assert.equal((await attempt(db, user, "select * from public.change_log")).rows.length, 0);
  assert.equal((await attempt(db, null, "select * from public.change_log")).ok, false);
  assert.ok(id);
});
