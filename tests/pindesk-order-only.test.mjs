// "Order only" businesses: how people get it, how to order, where they deliver, no home address, tick, nearby reminders.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ACCESS_LABEL, cleanOrder, draftFromRow, emptyOrder, looksLikeAddress, orderFilled, orderWays, placesForNearby } from "../src/lib/orderOnly.ts";
import { businessChecklist, businessComplete } from "../src/lib/listRules.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");
const base = { name: "Sweet Home Bakes", type: "restaurant", instagram_handle: "sweet.home", business_email: null, business_whatsapp: "+971501234567", not_needed: {} };

test("the three choices are the ones asked for", () => {
  assert.deepEqual(ACCESS_LABEL, { place: "Has a place to visit", order_only: "Order only (no place to visit)", both: "Both" });
  assert.equal(emptyOrder().access, "place"); // the default is still a place to visit
});

test("NO HOME ADDRESS: no address field anywhere, a clear note on the form, areas only", () => {
  const sql = read("supabase/pindesk_order_only.sql").replace(/^--.*$/gm, "");
  assert.doesNotMatch(sql, /address|street|home_|house|flat/i);
  const form = read("src/components/admin/OrderFields.tsx");
  assert.match(form, /ADDRESS_NOTE/);
  assert.match(read("src/lib/orderOnly.ts"), /Never type a home address\. There is no address box on purpose/);
  assert.doesNotMatch(form, /id="of-address"|label[^>]*>[^<]*address/i); // no address box (the word appears only in the note and the warning)
  for (const f of ["AddBusiness", "BusinessEdit", "OrderFields"]) assert.doesNotMatch(read(`src/components/admin/${f}.tsx`), /name="address"|autoComplete="street-address"|id="[a-z-]*address/i, f);
  // a gentle warning, never a block
  assert.ok(looksLikeAddress("Villa 12, Street 4"));
  assert.ok(looksLikeAddress("Flat 3B"));
  assert.ok(looksLikeAddress("Building #5"));
  assert.ok(!looksLikeAddress("Khalifa City, Mussafah"));
  assert.match(form, /looksLikeAddress\(value\.areas\)/);
  assert.match(form, /You can still save/);
});

test("how to order: any of Instagram message, business WhatsApp, website or app name", () => {
  assert.equal(orderFilled({}), false);
  assert.equal(orderFilled({ order_instagram: true }), true);
  assert.equal(orderFilled({ order_whatsapp: true }), true);
  assert.equal(orderFilled({ order_website: " example.ae " }), true);
  assert.equal(orderFilled({ order_app: "Talabat" }), true);
  assert.equal(orderFilled({ order_website: "  " }), false);
  assert.deepEqual(orderWays({ order_instagram: true, order_whatsapp: true, order_website: "w.ae", order_app: "Noon" }, "sweet.home", "+971 50"), ["Instagram message (@sweet.home)", "Business WhatsApp (+971 50)", "Website: w.ae", "App: Noon"]);
});

test("FAST CAPTURE: saving never fails: long text is cut, unknown emirates dropped, empty is fine", () => {
  const f = cleanOrder({ access: "order_only", viaInstagram: false, viaWhatsapp: false, website: "w".repeat(500), app: "a".repeat(300), emirates: ["Dubai", "Mars", "Abu Dhabi"], areas: "x".repeat(900) });
  assert.deepEqual([f.order_website.length, f.order_app.length, f.deliver_areas.length], [200, 80, 500]);
  assert.deepEqual(f.deliver_emirates, ["Abu Dhabi", "Dubai"]);
  const none = cleanOrder({ ...emptyOrder(), access: "order_only" });
  assert.deepEqual([none.order_website, none.order_app, none.deliver_areas, none.deliver_emirates], [null, null, null, []]);
  assert.deepEqual(draftFromRow({}), emptyOrder()); // an older business: a place to visit
  const form = read("src/lib/orderOnly.ts");
  assert.doesNotMatch(form.slice(form.indexOf("export function cleanOrder")), /problem/); // cleaning has no way to say "no"
});

test("the tick: an order-only place is complete with How to order, with no location", () => {
  const order = { ...base, access_kind: "order_only", order_whatsapp: true };
  const none = { locations: 0, reels: 1 };
  assert.equal(businessComplete(order, none), true);
  const keys = businessChecklist(order, none).map((c) => c.key);
  assert.ok(keys.includes("how_to_order") && !keys.includes("locations"));
  assert.equal(businessChecklist(order, none).length, 6);
  // How to order empty: that is what is missing
  const empty = { ...order, order_whatsapp: false };
  assert.deepEqual(businessChecklist(empty, none).filter((c) => c.state === "missing").map((c) => c.key), ["how_to_order"]);
  assert.equal(businessComplete({ ...empty, not_needed: { how_to_order: true } }, none), true); // an admin can mark it Not needed
  // a place with a place to visit still needs a location; so does "Both"
  assert.equal(businessComplete({ ...base, access_kind: "place", business_email: "a@b.ae" }, none), false);
  assert.equal(businessComplete({ ...base, access_kind: "both", order_whatsapp: true }, none), false);
  assert.equal(businessComplete({ ...base, access_kind: "both", order_whatsapp: true }, { locations: 1, reels: 1 }), true);
  // the other five still count for an order-only place
  assert.equal(businessComplete({ ...order, instagram_handle: null }, none), false);
  assert.equal(businessComplete(order, { locations: 0, reels: 0 }), false);
});

test("ORDER-ONLY PLACES ARE NEVER USED FOR NEARBY REMINDERS", () => {
  const rows = [{ id: 1, access_kind: "place" }, { id: 2, access_kind: "order_only" }, { id: 3, access_kind: "both" }, { id: 4 }];
  assert.deepEqual(placesForNearby(rows).map((r) => r.id), [1, 3, 4]);
  assert.match(read("supabase/pindesk_order_only.sql"), /nearby_ok\s+boolean generated always as \(access_kind <> 'order_only'\) stored/);
});

test("the pages show it: the Order only label in the lists, the details on the restaurant page", () => {
  const lists = read("src/components/admin/AdminLists.tsx");
  assert.match(lists, /badge: b\.access_kind === "order_only" \? "Order only"/);
  assert.match(lists, /How people get it/);
  assert.match(read("src/components/admin/ListShell.tsx"), /r\.badge/);
  const view = read("src/components/admin/BusinessView.tsx");
  for (const t of ["How people get it", "How to order:", "Where they deliver:", "Order only", "never used for nearby reminders", "No place to visit"]) assert.ok(view.includes(t), t);
  const add = read("src/components/admin/AddBusiness.tsx");
  assert.match(add, /<OrderFields/);
  assert.match(read("src/components/admin/BusinessEdit.tsx"), /<OrderFields/);
  for (const f of ["OrderFields", "BusinessView", "AdminLists", "ListShell"]) {
    assert.doesNotMatch(read(`src/components/admin/${f}.tsx`), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(read(`src/components/admin/${f}.tsx`), /\p{Extended_Pictographic}/u, f);
  }
});

test("saving still works before the new SQL file is run", () => {
  for (const f of ["AddBusiness", "BusinessEdit"]) {
    const s = read(`src/components/admin/${f}.tsx`);
    assert.match(s, /ORDER_COLUMN_WORDS\.test/, f); // retries without the new fields
    assert.match(s, /RUN_THE_FILE/, f); // and says what to run
  }
  assert.match(read("src/components/admin/AdminLists.tsx"), /from\("businesses"\)\.select\("\*"\)/); // the lists read either way
});

test("the new SQL file exists, and the older ones were not edited to hold these fields", () => {
  assert.ok(existsSync("supabase/pindesk_order_only.sql"));
  for (const f of ["pindesk.sql", "pindesk_codes.sql", "pindesk_offers.sql", "pindesk_log.sql", "pindesk_complete.sql", "pindesk_online.sql"]) assert.doesNotMatch(read(`supabase/${f}`), /order_only|access_kind|deliver_emirates/, f);
  assert.match(read("SITE_RULES.md"), /Never store or show a home address/);
});

// ---------------------------------------------------------------- the real database rules
async function setup(role = "main_admin") {
  const db = await makeDb();
  const who = { id: await addUser(db, "w@example.com"), email: "w@example.com" };
  await db.exec(`insert into public.team_members (email, name, role) values ('w@example.com','W','${role}')`);
  return { db, who };
}
const add = (db, who, cols, vals) => attempt(db, who, `insert into public.businesses (name, type, ${cols}) values ('Home Bakes', 'restaurant', ${vals}) returning access_kind, order_whatsapp, order_website, order_app, deliver_emirates, deliver_areas, nearby_ok`);

test("database: a business is a place to visit by default; order-only is never nearby", async () => {
  const { db, who } = await setup();
  const plain = await add(db, who, "instagram_handle", "'x'");
  assert.ok(plain.ok, plain.error);
  assert.deepEqual([plain.rows[0].access_kind, plain.rows[0].nearby_ok], ["place", true]);
  const only = await add(db, who, "access_kind, order_whatsapp, order_website, order_app, deliver_emirates, deliver_areas", "'order_only', true, 'https://x.ae', 'Talabat', array['Dubai','Abu Dhabi'], 'Khalifa City, Mussafah'");
  assert.ok(only.ok, only.error);
  const r = only.rows[0];
  assert.deepEqual([r.access_kind, r.order_whatsapp, r.order_website, r.order_app, r.deliver_emirates, r.deliver_areas, r.nearby_ok], ["order_only", true, "https://x.ae", "Talabat", ["Abu Dhabi", "Dubai"], "Khalifa City, Mussafah", false]);
  const both = await add(db, who, "access_kind", "'both'");
  assert.equal(both.rows[0].nearby_ok, true); // a "both" place is used only through its own locations
});

test("database: nearby_ok cannot be set by hand; a bad choice is the only thing refused", async () => {
  const { db, who } = await setup();
  assert.equal((await add(db, who, "access_kind, nearby_ok", "'order_only', true")).ok, false);
  assert.equal((await add(db, who, "access_kind", "'moon'")).ok, false);
  // switching to order only turns nearby off
  await db.exec("insert into public.businesses (name, type) values ('Switch','shop')");
  const sw = await attempt(db, who, "update public.businesses set access_kind = 'order_only' where name = 'Switch' returning nearby_ok");
  assert.equal(sw.rows[0].nearby_ok, false);
});

test("database: fast capture, long text is cut, unknown emirates dropped, blanks become nothing", async () => {
  const { db, who } = await setup();
  const r = await add(db, who, "access_kind, order_website, order_app, deliver_areas, deliver_emirates", `'order_only', '${"w".repeat(400)}', '${"a".repeat(200)}', '${"x".repeat(800)}', array['Dubai','Narnia','Dubai']`);
  assert.ok(r.ok, r.error);
  assert.deepEqual([r.rows[0].order_website.length, r.rows[0].order_app.length, r.rows[0].deliver_areas.length, r.rows[0].deliver_emirates], [200, 80, 500, ["Dubai"]]);
  const blank = await add(db, who, "order_website, order_app, deliver_areas", "'  ', '', '   '");
  assert.deepEqual([blank.rows[0].order_website, blank.rows[0].order_app, blank.rows[0].deliver_areas, blank.rows[0].deliver_emirates], [null, null, null, []]);
});

test("database: there is no address column on any business or location table", async () => {
  const { db } = await setup();
  const cols = (await db.query("select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('businesses','locations','building_places') order by 1,2")).rows;
  assert.ok(cols.length > 10);
  assert.deepEqual(cols.filter((c) => /address|street|flat|apartment|villa|house/i.test(c.column_name)), []);
});

test("database: a reel can link to an order-only business with no location", async () => {
  const { db, who } = await setup();
  await db.exec("insert into public.businesses (name, type, access_kind) values ('Cloud Kitchen','restaurant','order_only')");
  const r = await attempt(db, who, `insert into public.reels (url, link_key, platform, business_id) select 'https://www.instagram.com/reel/OO1/', 'instagram/OO1', 'instagram', id from public.businesses where name = 'Cloud Kitchen' returning code, location_id`);
  assert.ok(r.ok, r.error);
  assert.equal(r.rows[0].location_id, null);
});

test("database: 'How to order' Not needed is admin only, and then the order details must be empty", async () => {
  const { db } = await setup();
  await db.exec("insert into public.businesses (name, type, access_kind) values ('OO','shop','order_only')");
  const set = (role) => attempt(db, role, `update public.businesses set not_needed = '{"how_to_order": true}' where name = 'OO'`);
  const admin = { id: await addUser(db, "adm@example.com"), email: "adm@example.com" };
  const helper = { id: await addUser(db, "hp@example.com"), email: "hp@example.com" };
  await db.exec("insert into public.team_members (email, name, role) values ('adm@example.com','Adm','associate'), ('hp@example.com','Hp','helper')");
  assert.ok((await set(admin)).ok);
  const h = await set(helper);
  assert.equal(h.ok, false);
  assert.match(h.error, /Only the main admin and associates/);
  await db.exec("update public.businesses set order_app = 'Noon' where name = 'OO'");
  assert.equal((await set(admin)).ok, false); // an order detail is filled in, so it cannot be "not needed"
});
