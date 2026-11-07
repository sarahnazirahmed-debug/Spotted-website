// Tests for Step 10: a page for each restaurant or shop, the tick, "Not needed" (admins only), Incomplete, Permanently closed.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { businessChecklist, businessComplete } from "../src/lib/listRules.ts";
import { canMarkNotNeeded } from "../src/lib/teamRules.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const full = { name: "Cafe Noor", type: "restaurant", instagram_handle: "cafe.noor", business_email: "hi@cafe.ae", business_whatsapp: null, not_needed: {} };
const have = { locations: 1, reels: 1 };

test("the tick needs all six: name, type, Instagram, a location, a reel, a business contact", () => {
  assert.equal(businessChecklist(full, have).length, 6);
  assert.equal(businessComplete(full, have), true);
  const missing = (b, c = have) => businessChecklist(b, c).filter((x) => x.state === "missing").map((x) => x.key);
  assert.deepEqual(missing({ ...full, name: " " }), ["name"]);
  assert.deepEqual(missing({ ...full, type: null }), ["type"]);
  assert.deepEqual(missing({ ...full, instagram_handle: null }), ["instagram_handle"]);
  assert.deepEqual(missing(full, { locations: 0, reels: 1 }), ["locations"]);
  assert.deepEqual(missing(full, { locations: 1, reels: 0 }), ["reels"]);
  assert.deepEqual(missing({ ...full, business_email: null }), ["contact"]);
  assert.equal(businessComplete({ ...full, business_email: null, business_whatsapp: "+971501234567" }, have), true); // WhatsApp alone is a contact
});

test("a detail marked Not needed counts as done; kind, email and WhatsApp alone are not part of the tick", () => {
  const bare = { name: "X", type: "shop", instagram_handle: null, business_email: null, business_whatsapp: null, not_needed: {} };
  assert.equal(businessComplete(bare, { locations: 0, reels: 0 }), false);
  const all = { instagram_handle: true, locations: true, reels: true, contact: true };
  assert.equal(businessComplete({ ...bare, not_needed: all }, { locations: 0, reels: 0 }), true);
  assert.equal(businessComplete({ ...bare, not_needed: { ...all, reels: false } }, { locations: 0, reels: 0 }), false);
  assert.equal(businessChecklist({ ...bare, not_needed: all }, { locations: 0, reels: 0 }).filter((c) => c.state === "not_needed").length, 4);
  // older marks (email and WhatsApp each not needed) still count as a contact not needed
  assert.equal(businessChecklist({ ...bare, not_needed: { business_email: true, business_whatsapp: true } }, have).find((c) => c.key === "contact").state, "not_needed");
  assert.equal(businessComplete({ ...full, subtype: null, not_needed: null }, have), true); // no kind needed
});

test("only the main admin and associates may mark Not needed", () => {
  assert.equal(canMarkNotNeeded("main_admin"), true);
  assert.equal(canMarkNotNeeded("associate"), true);
  assert.equal(canMarkNotNeeded("staff"), false);
  assert.equal(canMarkNotNeeded("helper"), false);
  assert.equal(canMarkNotNeeded(null), false);
});

test("each restaurant or shop has a page, the lists open it, and Incomplete is a real list", () => {
  for (const f of ["src/app/admin/restaurants/view/page.tsx", "src/app/admin/incomplete/page.tsx"]) assert.ok(existsSync(f), f);
  assert.match(readFileSync("src/app/admin/incomplete/page.tsx", "utf8"), /IncompleteList/);
  const lists = readFileSync("src/components/admin/AdminLists.tsx", "utf8");
  assert.match(lists, /\/admin\/restaurants\/view\?id=/);
  assert.match(lists, /Missing/);
  assert.match(lists, /closed: b\.permanently_closed/);
  const view = readFileSync("src/components/admin/BusinessView.tsx", "utf8");
  for (const t of ["Locations (", "Reels (", "ClosedBadge", "Not needed", "businessChecklist", "ChangeHistory"]) assert.ok(view.includes(t), t);
  assert.equal(readFileSync("src/components/admin/ClosedBadge.tsx", "utf8").includes("Permanently closed"), true);
});

test("nothing on the restaurant pages deletes anything", () => {
  for (const f of ["BusinessView", "BusinessEdit", "AdminLists", "ListShell"]) {
    const src = readFileSync(`src/components/admin/${f}.tsx`, "utf8");
    assert.doesNotMatch(src, /\.delete\(/, `${f} must not delete`);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(src, /\p{Extended_Pictographic}/u, f);
  }
  const edit = readFileSync("src/components/admin/BusinessEdit.tsx", "utf8");
  assert.match(edit, /disabled=\{!mayMark\}/); // the Not needed boxes are locked for non-admins
});

// ---------------------------------------------------------------- the database
async function setup() {
  const db = await makeDb();
  const P = {};
  for (const [k, role] of [["main", "main_admin"], ["assoc", "associate"], ["staff", "staff"], ["helper", "helper"]]) {
    const email = `${k}@example.com`;
    P[k] = { id: await addUser(db, email), email };
    await db.exec(`insert into public.team_members (email, name, role) values ('${email}','${k}','${role}')`);
  }
  await db.exec("insert into public.businesses (name, type) values ('Cafe Noor','restaurant')");
  return { db, P };
}

test("the database lets only admins set Not needed, and refuses unknown ones", async () => {
  const { db, P } = await setup();
  const set = (who, json) => attempt(db, who, "update public.businesses set not_needed = $1::jsonb where name = 'Cafe Noor' returning not_needed", [json]);
  assert.ok((await set(P.main, '{"reels": true, "locations": true, "contact": true}')).ok);
  assert.ok((await set(P.assoc, '{"instagram_handle": true}')).ok);
  for (const who of [P.staff, P.helper]) {
    const r = await set(who, '{"reels": true}');
    assert.equal(r.ok, false);
    assert.match(r.error, /Only the main admin and associates/);
  }
  assert.equal((await set(P.main, '{"pizza": true}')).ok, false); // an unknown key
  // staff can still change other things, and a plain edit that leaves Not needed alone is fine
  assert.ok((await attempt(db, P.staff, "update public.businesses set instagram_handle = 'cafe.noor' where name = 'Cafe Noor'")).ok);
});

test("contact Not needed means the email and WhatsApp must be empty", async () => {
  const { db, P } = await setup();
  await db.exec("update public.businesses set business_email = 'a@b.ae' where name = 'Cafe Noor'");
  const bad = await attempt(db, P.main, `update public.businesses set not_needed = '{"contact": true}' where name = 'Cafe Noor'`);
  assert.equal(bad.ok, false);
  await db.exec("update public.businesses set business_email = null where name = 'Cafe Noor'");
  assert.ok((await attempt(db, P.main, `update public.businesses set not_needed = '{"contact": true}' where name = 'Cafe Noor'`)).ok);
});

test("marking Not needed, and closing a place, are logged with who did it", async () => {
  const { db, P } = await setup();
  await db.exec("begin");
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: P.assoc.id, email: P.assoc.email, role: "authenticated" })]);
  await db.query(`update public.businesses set not_needed = '{"reels": true}', permanently_closed = true where name = 'Cafe Noor'`);
  const log = (await db.query("select changed_by, changes from public.change_log where table_name='businesses' and action='changed'")).rows;
  await db.exec("rollback");
  assert.equal(log.length, 1);
  assert.equal(log[0].changed_by, "assoc");
  assert.deepEqual(Object.keys(log[0].changes).sort(), ["not_needed", "permanently_closed"]);
});
