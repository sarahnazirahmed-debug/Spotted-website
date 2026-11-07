// Online offers: Where, app or website name, promo code, optional place link, fast capture, never used for nearby reminders.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { cleanOffers, draftFromOffer, emptyOffer, offersForNearby, ONLINE_APPS, WHERE_LABEL } from "../src/lib/reelDeals.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");
const offer = (o) => ({ ...emptyOffer(), ...o });

test("the choices and suggestions are the ones asked for", () => {
  assert.deepEqual(WHERE_LABEL, { place: "At the place", online: "Online or in an app" });
  assert.deepEqual(ONLINE_APPS, ["Smiles", "Noon", "Talabat", "Deliveroo", "Careem"]);
  assert.equal(emptyOffer().where, "place"); // the default is still "At the place"
});

test("an online offer keeps its app name, promo code and place link; a place offer drops the app name", () => {
  const r = cleanOffers([offer({ where: "online", title: "Free delivery", discount: "Free delivery", appName: " Talabat ", promo: " SAVE10 ", businessId: "b1" })]);
  assert.equal(r.problem, null);
  assert.deepEqual([r.offers[0].where_kind, r.offers[0].online_name, r.offers[0].promo_code, r.offers[0].business_id], ["online", "Talabat", "SAVE10", "b1"]);
  const p = cleanOffers([offer({ where: "place", title: "Lunch", discount: "25% off", appName: "Noon" })]);
  assert.equal(p.offers[0].online_name, null);
  const none = cleanOffers([offer({ where: "online", discount: "20% off", appName: "Noon" })]);
  assert.equal(none.offers[0].business_id, null); // no place at all is fine
});

test("FAST CAPTURE: an online offer never blocks a save", () => {
  // only an app name: the title is filled in
  assert.deepEqual(cleanOffers([offer({ where: "online", appName: "Smiles" })]).offers.map((o) => o.title), ["Smiles"]);
  // only a promo code
  assert.equal(cleanOffers([offer({ where: "online", promo: "WELCOME" })]).offers[0].title, "WELCOME");
  // no discount, no title
  assert.equal(cleanOffers([offer({ where: "online", businessId: "x" })]).problem, null);
  assert.equal(cleanOffers([offer({ where: "online", businessId: "x" })]).offers[0].title, "Online offer");
  // very long text is cut, never refused
  const long = cleanOffers([offer({ where: "online", title: "t".repeat(500), appName: "a".repeat(300), promo: "p".repeat(300), discount: "d".repeat(500), conditions: "c".repeat(5000) })]);
  assert.equal(long.problem, null);
  const o = long.offers[0];
  assert.deepEqual([o.title.length, o.online_name.length, o.promo_code.length, o.discount.length, o.conditions.length], [160, 80, 40, 200, 2000]);
  // an untouched online box is ignored, as before
  assert.equal(cleanOffers([offer({ where: "online" })]).offers.length, 0);
  // the older rule for offers at a place is unchanged
  assert.match(cleanOffers([offer({ title: "x" })]).problem, /discount/);
});

test("an online offer does not make Posted on required", () => {
  const form = read("src/components/admin/ReelForm.tsx");
  assert.match(form, /filter\(\(o\) => o\.where_kind !== "online"\)/);
});

test("ONLINE OFFERS ARE NEVER USED FOR NEARBY REMINDERS", () => {
  const list = [{ id: 1, where_kind: "place" }, { id: 2, where_kind: "online" }, { id: 3 }]; // an older offer has no where_kind: it is at the place
  assert.deepEqual(offersForNearby(list).map((o) => o.id), [1, 3]);
  assert.deepEqual(offersForNearby([{ where_kind: "online" }]), []);
  const sql = read("supabase/pindesk_online.sql");
  assert.match(sql, /nearby_ok\s+boolean generated always as \(where_kind = 'place'\) stored/);
});

test("saved online offers read back into the form", () => {
  const d = draftFromOffer({ id: "1", title: "T", discount: "D", conditions: null, end_date: null, where_kind: "online", online_name: "Noon", promo_code: "X1", business_id: "b" });
  assert.deepEqual([d.where, d.appName, d.promo, d.businessId], ["online", "Noon", "X1", "b"]);
  assert.equal(draftFromOffer({ title: "Old", discount: null, conditions: null, end_date: null }).where, "place"); // an older offer
});

test("the offer box has Where, App or website name with suggestions, Promo code and an optional place", () => {
  const x = read("src/components/admin/ReelExtras.tsx");
  for (const t of ["Where", "App or website name", "Promo code (optional)", "Linked restaurant or shop (optional)", "No place", "never used for nearby reminders", "<datalist", "ONLINE_APPS"]) assert.ok(x.includes(t), t);
  assert.match(x, /o\.where === "online" && \(/); // the app name box shows only for Online
  assert.doesNotMatch(x, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(x, /\p{Extended_Pictographic}/u);
});

test("online offers show with Seen in a reel, the posted date and the time passed", () => {
  const d = read("src/components/admin/ReelDetails.tsx");
  for (const t of ["Online", "Promo code:", "SEEN_IN_A_REEL", "timeAgo(postedOn)", "niceDay(postedOn)"]) assert.ok(d.includes(t), t);
  assert.match(d, /hasAny/);
  // it is shown on the Pin Desk list, where every reel appears
  assert.match(read("src/components/admin/PinDesk.tsx"), /<ReelDetails[\s\S]{0,400}?offers=/);
});

test("saving still works before the new SQL file is run", () => {
  const s = read("src/lib/reelExtrasSave.ts");
  assert.match(s, /pindesk_online\.sql/); // it tells the person to run the file
  assert.match(s, /r = await write\(row\)/); // and saves the offer without the online fields
  for (const f of ["src/components/admin/PinDesk.tsx", "src/components/admin/ReelEdit.tsx"]) assert.match(read(f), /from\("reel_offers"\)\.select\("\*"\)/, f); // reading offers works either way
});

test("the new SQL file exists and the older ones are not edited to hold these fields", () => {
  assert.ok(existsSync("supabase/pindesk_online.sql"));
  for (const f of ["pindesk.sql", "pindesk_codes.sql", "pindesk_offers.sql", "pindesk_log.sql", "pindesk_complete.sql"]) assert.doesNotMatch(read(`supabase/${f}`), /online_name|promo_code|where_kind/, f);
});

// ---------------------------------------------------------------- the real database rules
async function setup() {
  const db = await makeDb();
  const who = { id: await addUser(db, "h@example.com"), email: "h@example.com" };
  await db.exec(`insert into public.team_members (email, name, role) values ('h@example.com','Helper','helper');
    insert into public.businesses (name, type) values ('Cafe A','restaurant');
    insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/ON1/','instagram/ON1','instagram')`);
  return { db, who };
}
const ins = (db, who, cols, vals) => attempt(db, who, `insert into public.reel_offers (reel_id, title, ${cols}) select id, 'Offer', ${vals} from public.reels where link_key='instagram/ON1' returning where_kind, online_name, promo_code, business_id, nearby_ok`);

test("database: online offer, linked or not, never nearby; place offer is nearby", async () => {
  const { db, who } = await setup();
  const on = await ins(db, who, "where_kind, online_name, promo_code", "'online', 'Talabat', 'SAVE10'");
  assert.ok(on.ok, on.error);
  assert.deepEqual([on.rows[0].where_kind, on.rows[0].online_name, on.rows[0].promo_code, on.rows[0].business_id, on.rows[0].nearby_ok], ["online", "Talabat", "SAVE10", null, false]);
  const linked = await ins(db, who, "where_kind, business_id", "'online', (select id from public.businesses limit 1)");
  assert.ok(linked.ok, linked.error);
  assert.equal(linked.rows[0].nearby_ok, false);
  assert.ok(linked.rows[0].business_id);
  const place = await ins(db, who, "discount", "'25% off'");
  assert.equal(place.rows[0].where_kind, "place"); // the default
  assert.equal(place.rows[0].nearby_ok, true);
});

test("database: nearby_ok cannot be set by hand, and a place offer drops any app name", async () => {
  const { db, who } = await setup();
  const hand = await ins(db, who, "where_kind, nearby_ok", "'online', true");
  assert.equal(hand.ok, false);
  const place = await ins(db, who, "where_kind, online_name", "'place', 'Noon'");
  assert.ok(place.ok, place.error);
  assert.equal(place.rows[0].online_name, null);
  // switching an offer from place to online turns nearby off
  const id = (await db.query("insert into public.reel_offers (reel_id, title) select id, 'X' from public.reels where link_key='instagram/ON1' returning id")).rows[0].id;
  const sw = await attempt(db, who, "update public.reel_offers set where_kind = 'online', online_name = 'Careem' where id = $1 returning nearby_ok, online_name", [id]);
  assert.ok(sw.ok, sw.error);
  assert.deepEqual([sw.rows[0].nearby_ok, sw.rows[0].online_name], [false, "Careem"]);
});

test("database: fast capture, too-long names and codes are cut, empty boxes become nothing, never refused", async () => {
  const { db, who } = await setup();
  const r = await ins(db, who, "where_kind, online_name, promo_code", `'online', '${"a".repeat(200)}', '${"p".repeat(200)}'`);
  assert.ok(r.ok, r.error);
  assert.equal(r.rows[0].online_name.length, 80);
  assert.equal(r.rows[0].promo_code.length, 40);
  const blank = await ins(db, who, "where_kind, online_name, promo_code", "'online', '   ', ''");
  assert.ok(blank.ok, blank.error);
  assert.deepEqual([blank.rows[0].online_name, blank.rows[0].promo_code], [null, null]);
  // a bad value for where is the only thing refused
  assert.equal((await ins(db, who, "where_kind", "'moon'")).ok, false);
});

test("database: deleting the linked restaurant keeps the offer", async () => {
  const { db, who } = await setup();
  await db.exec("insert into public.reel_offers (reel_id, title, where_kind, business_id) select r.id, 'Linked', 'online', b.id from public.reels r, public.businesses b");
  await db.exec("delete from public.businesses");
  assert.equal((await db.query("select business_id from public.reel_offers where title = 'Linked'")).rows[0].business_id, null);
  assert.ok(who);
});
