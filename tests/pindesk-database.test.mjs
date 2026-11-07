// Tests for supabase/pindesk.sql on a real in-memory Postgres: the new Pin Desk tables and their rules.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, as, attempt, makeDb } from "./helpers-db.mjs";

let db;
const P = {};
const TABLES = ["businesses", "locations", "building_places", "reel_items", "reel_deals", "reel_deal_prices", "reel_offers"];

before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", assoc: "assoc@example.com", staff: "staff@example.com", helper: "helper@example.com", user: "user@example.com" })) {
    P[k] = { id: await addUser(db, email), email };
  }
  await db.exec(`
    insert into public.team_members (email, name, role) values
      ('main@example.com','Main Admin','main_admin'), ('assoc@example.com','Associate One','associate'),
      ('staff@example.com','Staff Person','staff'), ('helper@example.com','Helper Person','helper');
  `);
});

const biz = (name = "Saffron Table", extra = "") => `insert into public.businesses (name, type ${extra ? "," + extra.split("|")[0] : ""}) values ('${name}', 'restaurant' ${extra ? "," + extra.split("|")[1] : ""})`;
const reelSql = (key = "A1") => `insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/${key}/', 'instagram/${key}', 'instagram')`;

// ---------------------------------------------------------------- who may do what
test("logged-out visitors and people who are not on the team get nothing from any new table", async () => {
  await db.exec(biz("Seed Cafe"));
  for (const t of TABLES) {
    const anon = await attempt(db, null, `select * from public.${t}`);
    assert.equal(anon.ok ? anon.rows.length : 0, 0, `${t} leaked to a logged-out visitor`);
    const user = await attempt(db, P.user, `select * from public.${t}`);
    assert.equal(user.rows.length, 0, `${t} leaked to a non-member`);
  }
  assert.equal((await attempt(db, null, biz("Hacker"))).ok, false);
  assert.equal((await attempt(db, P.user, biz("Hacker"))).ok, false);
  assert.equal((await attempt(db, P.user, "insert into public.locations (name) values ('x')")).ok, false);
});

test("all four team roles can read and add", async () => {
  for (const who of [P.main, P.assoc, P.staff, P.helper]) {
    const r = await as(db, who, async (d) => {
      await d.query(biz("By " + who.email.split("@")[0]));
      await d.query(`insert into public.locations (name, lat, lng) values ('Loc by ${who.email}', 25.1, 55.2)`);
      return (await d.query("select count(*)::int as n from public.businesses")).rows[0].n;
    });
    assert.ok(r >= 2, `${who.email} could not use businesses`);
  }
});

test("only the main admin and associates can delete", async () => {
  await db.exec(biz("To Delete"));
  for (const who of [P.staff, P.helper]) {
    const r = await attempt(db, who, "delete from public.businesses where name = 'To Delete'");
    assert.equal(r.affected ?? 0, 0, `${who.email} deleted a business`);
  }
  assert.equal((await attempt(db, P.assoc, "delete from public.businesses where name = 'To Delete'")).affected, 1);
  assert.equal((await attempt(db, P.main, "delete from public.businesses where name = 'To Delete'")).affected, 1);
});

// ---------------------------------------------------------------- added by, dates, codes
test("added by and the date come from the log-in and cannot be faked or changed", async () => {
  const r = await as(db, P.helper, async (d) => {
    await d.query("insert into public.businesses (name, type, added_by, created_at) values ('Faker Cafe', 'restaurant', 'Someone Else', '2001-01-01')");
    const a = (await d.query("select added_by, created_at from public.businesses where name = 'Faker Cafe'")).rows[0];
    await d.query("update public.businesses set added_by = 'Other', created_at = '2002-02-02', name = 'Faker Cafe 2' where name = 'Faker Cafe'");
    const b = (await d.query("select added_by, created_at, name from public.businesses where name = 'Faker Cafe 2'")).rows[0];
    return { a, b };
  });
  assert.equal(r.a.added_by, "Helper Person");
  assert.ok(new Date(r.a.created_at).getFullYear() >= 2026);
  assert.equal(r.b.added_by, "Helper Person");
  assert.equal(new Date(r.b.created_at).getTime(), new Date(r.a.created_at).getTime());
});

test("every new table that stamps rows fills added by from the log-in", async () => {
  const r = await as(db, P.staff, async (d) => {
    await d.query(reelSql("STAMP1"));
    await d.query("insert into public.locations (name, is_building) values ('Mall', true)");
    await d.query("insert into public.building_places (location_id, name) select id, 'Shop 1' from public.locations where name = 'Mall'");
    await d.query("insert into public.reel_items (reel_id, name, price_aed) select id, 'Tea', 7 from public.reels where link_key = 'instagram/STAMP1'");
    await d.query("insert into public.reel_deals (reel_id, title) select id, 'Family deal' from public.reels where link_key = 'instagram/STAMP1'");
    await d.query("insert into public.reel_deal_prices (deal_id, people, total_price_aed) select id, 2, 120 from public.reel_deals where title = 'Family deal'");
    await d.query("insert into public.reel_offers (reel_id, title) select id, '20% off' from public.reels where link_key = 'instagram/STAMP1'");
    const out = {};
    for (const t of ["locations", "building_places", "reel_items", "reel_deals", "reel_deal_prices", "reel_offers"]) {
      out[t] = (await d.query(`select added_by, created_at from public.${t} limit 1`)).rows[0];
    }
    return out;
  });
  for (const [t, row] of Object.entries(r)) {
    assert.equal(row.added_by, "Staff Person", `${t} did not get added_by`);
    assert.ok(row.created_at, `${t} has no date`);
  }
});

test("codes are made by the database, never typed, and never change (the full code tests are in pindesk-codes.test.mjs)", async () => {
  const r = await as(db, P.assoc, async (d) => {
    await d.query("insert into public.businesses (name, type, code) values ('Typed Code Cafe', 'restaurant', 'MYCODE-1')");
    await d.query("insert into public.locations (name) values ('Loc Auto')");
    await d.query(reelSql("CODE1"));
    const biz1 = (await d.query("select code from public.businesses where name = 'Typed Code Cafe'")).rows[0].code;
    const loc = (await d.query("select code from public.locations where name = 'Loc Auto'")).rows[0].code;
    const reel = (await d.query("select code from public.reels where link_key = 'instagram/CODE1'")).rows[0].code;
    await d.query("update public.businesses set code = 'HACKED-1' where name = 'Typed Code Cafe'");
    const after = (await d.query("select code from public.businesses where name = 'Typed Code Cafe'")).rows[0].code;
    return { biz1, loc, reel, after };
  });
  assert.match(r.biz1, /^[A-HJ-NP-Z]{4}[2-9]{4}$/, "the typed code was used");
  assert.match(r.loc, /^[A-HJ-NP-Z]{10}[2-9]{10}$/);
  assert.match(r.reel, /^[A-HJ-NP-Z]{8}[2-9]{8}$/);
  assert.equal(r.after, r.biz1, "a code changed");
});

// ---------------------------------------------------------------- businesses
test("a business is a restaurant or a shop, and the details are tidied", async () => {
  assert.equal((await attempt(db, P.main, "insert into public.businesses (name, type) values ('X', 'museum')")).ok, false);
  const r = await as(db, P.main, async (d) => {
    await d.query("insert into public.businesses (name, type, subtype, instagram_handle, business_email, business_whatsapp) values ('  Tidy Shop  ', 'shop', '  fashion ', ' @Tidy.Shop ', ' Hello@Tidy.COM ', '+971 50 123 4567')");
    return (await d.query("select name, subtype, instagram_handle, business_email, business_whatsapp, permanently_closed, not_needed from public.businesses where name = 'Tidy Shop'")).rows[0];
  });
  assert.deepEqual(r, { name: "Tidy Shop", subtype: "fashion", instagram_handle: "tidy.shop", business_email: "hello@tidy.com", business_whatsapp: "+971 50 123 4567", permanently_closed: false, not_needed: {} });
  for (const bad of ["business_email|'not an email'", "business_whatsapp|'abc'", "instagram_handle|'has spaces'", "instagram_handle|'" + "a".repeat(31) + "'"]) {
    assert.equal((await attempt(db, P.main, biz("Bad", bad))).ok, false, bad);
  }
});

test("details can be marked Not needed, and then they must be empty", async () => {
  assert.equal((await attempt(db, P.main, biz("NN1", `not_needed|'{"instagram_handle": true, "business_whatsapp": true}'::jsonb`))).ok, true);
  assert.equal((await attempt(db, P.main, "insert into public.businesses (name, type, not_needed, instagram_handle) values ('NN3', 'shop', '{\"instagram_handle\": true}', 'shopname')")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.businesses (name, type, not_needed) values ('NN4', 'shop', '{\"favourite_colour\": true}')")).ok, false); // unknown detail
  assert.equal((await attempt(db, P.main, "insert into public.businesses (name, type, not_needed) values ('NN5', 'shop', '{\"subtype\": \"yes\"}')")).ok, false); // must be true or false
  assert.equal((await attempt(db, P.main, "insert into public.businesses (name, type, not_needed) values ('NN6', 'shop', '[]')")).ok, false);
});

test("a business can be marked permanently closed", async () => {
  const r = await as(db, P.staff, async (d) => {
    await d.query("insert into public.businesses (name, type, permanently_closed) values ('Gone Cafe', 'restaurant', true)");
    return (await d.query("select permanently_closed from public.businesses where name = 'Gone Cafe'")).rows[0].permanently_closed;
  });
  assert.equal(r, true);
});

// ---------------------------------------------------------------- locations and buildings
test("a location has an optional restaurant or shop, an emirate, and a pin with both numbers or none", async () => {
  assert.equal((await attempt(db, P.main, "insert into public.locations (name) values ('Just a name')")).ok, true);
  assert.equal((await attempt(db, P.main, "insert into public.locations (name, lat) values ('Half a pin', 25)")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.locations (name, lat, lng) values ('Off the map', 95, 55)")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.locations (name, lat, lng) values ('Off the map', 25, 200)")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.locations (name, maps_url) values ('Insecure', 'http://maps.google.com')")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.locations (name, maps_url, lat, lng, emirate) values ('Full', 'https://maps.google.com/?q=25,55', 25, 55, 'Dubai')")).ok, true);
});

test("deleting a restaurant keeps its locations and reels (they just lose the link)", async () => {
  const r = await as(db, P.main, async (d) => {
    await d.query(biz("Linked Cafe"));
    await d.query("insert into public.locations (name, business_id) select 'Linked branch', id from public.businesses where name = 'Linked Cafe'");
    await d.query("insert into public.reels (url, link_key, platform, business_id) select 'https://www.instagram.com/reel/LK1/', 'instagram/LK1', 'instagram', id from public.businesses where name = 'Linked Cafe'");
    await d.query("delete from public.businesses where name = 'Linked Cafe'");
    return {
      loc: (await d.query("select business_id from public.locations where name = 'Linked branch'")).rows,
      reel: (await d.query("select business_id from public.reels where link_key = 'instagram/LK1'")).rows,
    };
  });
  assert.equal(r.loc.length, 1);
  assert.equal(r.loc[0].business_id, null);
  assert.equal(r.reel.length, 1);
  assert.equal(r.reel[0].business_id, null);
});

test("places inside a building: only for malls and hotels, no repeats, and at most 500", async () => {
  await db.exec("insert into public.locations (name, is_building) values ('Big Mall', true), ('Plain Street', false)");
  const loc = async (n) => (await db.query(`select id from public.locations where name = '${n}'`)).rows[0].id;
  const mall = await loc("Big Mall");
  const street = await loc("Plain Street");
  assert.equal((await attempt(db, P.staff, `insert into public.building_places (location_id, name) values ('${street}', 'Nope')`)).ok, false);
  assert.equal((await attempt(db, P.staff, `insert into public.building_places (location_id, name) values ('${mall}', 'Shop A')`)).ok, true);
  await db.exec(`insert into public.building_places (location_id, name) values ('${mall}', 'Shop A')`);
  assert.equal((await attempt(db, P.staff, `insert into public.building_places (location_id, name) values ('${mall}', 'shop a')`)).ok, false); // same name, other capitals
  await db.exec(`insert into public.building_places (location_id, name) select '${mall}', 'Unit ' || g from generate_series(1, 499) g`);
  const n = (await db.query(`select count(*)::int as n from public.building_places where location_id = '${mall}'`)).rows[0].n;
  assert.equal(n, 500);
  const over = await attempt(db, P.staff, `insert into public.building_places (location_id, name) values ('${mall}', 'Unit 501')`);
  assert.equal(over.ok, false);
  assert.match(over.error, /at most 500/);
  // a building with places cannot stop being a building
  assert.equal((await attempt(db, P.staff, `update public.locations set is_building = false where id = '${mall}'`)).ok, false);
});

// ---------------------------------------------------------------- reels
test("a reel can be linked to a restaurant or shop and a location, both optional, with the date it was posted", async () => {
  assert.equal((await attempt(db, P.helper, reelSql("OPT1"))).ok, true);
  const r = await as(db, P.helper, async (d) => {
    await d.query(biz("Reel Cafe"));
    await d.query("insert into public.locations (name, business_id) select 'Reel Cafe, Khalifa City', id from public.businesses where name = 'Reel Cafe'");
    await d.query(`insert into public.reels (url, link_key, platform, business_id, location_id, posted_on)
      select 'https://www.instagram.com/reel/LNK/', 'instagram/LNK', 'instagram', b.id, l.id, '2026-10-01'
      from public.businesses b, public.locations l where b.name = 'Reel Cafe' and l.name = 'Reel Cafe, Khalifa City'`);
    return (await d.query("select code, business_id is not null as has_b, location_id is not null as has_l, posted_on::text as posted_on from public.reels where link_key = 'instagram/LNK'")).rows[0];
  });
  assert.match(r.code, /^[A-HJ-NP-Z]{8}[2-9]{8}$/);
  assert.equal(r.has_b, true);
  assert.equal(r.has_l, true);
  assert.equal(r.posted_on, "2026-10-01");
});

test("a reel cannot use a location that belongs to a different restaurant, or be posted in the future", async () => {
  await db.exec(biz("Cafe One"));
  await db.exec(biz("Cafe Two"));
  await db.exec("insert into public.locations (name, business_id) select 'One branch', id from public.businesses where name = 'Cafe One'");
  const mismatch = await attempt(db, P.main, `insert into public.reels (url, link_key, platform, business_id, location_id)
    select 'https://www.instagram.com/reel/MM1/', 'instagram/MM1', 'instagram', b.id, l.id from public.businesses b, public.locations l where b.name = 'Cafe Two' and l.name = 'One branch'`);
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /different restaurant or shop/);
  assert.equal((await attempt(db, P.main, "insert into public.reels (url, link_key, platform, posted_on) values ('https://www.instagram.com/reel/FUT/', 'instagram/FUT', 'instagram', current_date + 30)")).ok, false);
  assert.equal((await attempt(db, P.main, "insert into public.reels (url, link_key, platform, posted_on) values ('https://www.instagram.com/reel/OLD/', 'instagram/OLD', 'instagram', '1999-01-01')")).ok, false);
});

test("the old reel rules still work (Pinned needs a place name and a pin; added by and pinned by are filled in)", async () => {
  assert.equal((await attempt(db, P.staff, "insert into public.reels (url, link_key, platform, status) values ('https://www.instagram.com/reel/PIN0/', 'instagram/PIN0', 'instagram', 'pinned')")).ok, false);
  const r = await as(db, P.staff, async (d) => {
    await d.query("insert into public.reels (url, link_key, platform, place_name, lat, lng, status) values ('https://www.instagram.com/reel/PIN1/', 'instagram/PIN1', 'instagram', 'Place', 25, 55, 'pinned')");
    return (await d.query("select added_by, pinned_by from public.reels where link_key = 'instagram/PIN1'")).rows[0];
  });
  assert.deepEqual(r, { added_by: "Staff Person", pinned_by: "Staff Person" });
});

// ---------------------------------------------------------------- items, deals, offers
test("reel items have a name and a price of 0 or more", async () => {
  await db.exec(reelSql("IT1"));
  const id = (await db.query("select id from public.reels where link_key = 'instagram/IT1'")).rows[0].id;
  assert.equal((await attempt(db, P.staff, `insert into public.reel_items (reel_id, name, price_aed) values ('${id}', 'Saffron rice', 38.5)`)).ok, true);
  assert.equal((await attempt(db, P.staff, `insert into public.reel_items (reel_id, name, price_aed) values ('${id}', 'Free tea', 0)`)).ok, true);
  assert.equal((await attempt(db, P.staff, `insert into public.reel_items (reel_id, name, price_aed) values ('${id}', 'Negative', -1)`)).ok, false);
  assert.equal((await attempt(db, P.staff, `insert into public.reel_items (reel_id, name, price_aed) values ('${id}', '   ', 5)`)).ok, false);
  assert.equal((await attempt(db, P.staff, "insert into public.reel_items (reel_id, name, price_aed) values (gen_random_uuid(), 'Orphan', 5)")).ok, false);
});

test("a deal has what is included, conditions, an optional end date, and a price for each group size", async () => {
  await db.exec(reelSql("DL1"));
  const reel = (await db.query("select id from public.reels where link_key = 'instagram/DL1'")).rows[0].id;
  const r = await as(db, P.helper, async (d) => {
    await d.query(`insert into public.reel_deals (reel_id, title, included, conditions, end_date) values ('${reel}', 'Sharing feast', 'Starter, two mains, dessert', 'Weekdays only', '2026-12-31')`);
    await d.query(`insert into public.reel_deals (reel_id, title) values ('${reel}', 'No end date deal')`);
    const deal = (await d.query("select id from public.reel_deals where title = 'Sharing feast'")).rows[0].id;
    await d.query(`insert into public.reel_deal_prices (deal_id, people, total_price_aed) values ('${deal}', 2, 120), ('${deal}', 4, 220)`);
    return {
      deals: (await d.query("select title, end_date::text as end_date from public.reel_deals order by title")).rows,
      prices: (await d.query("select people, total_price_aed::float as total from public.reel_deal_prices order by people")).rows,
      deal,
    };
  });
  assert.deepEqual(r.deals, [{ title: "No end date deal", end_date: null }, { title: "Sharing feast", end_date: "2026-12-31" }]);
  assert.deepEqual(r.prices, [{ people: 2, total: 120 }, { people: 4, total: 220 }]);
  assert.equal((await attempt(db, P.helper, `insert into public.reel_deal_prices (deal_id, people, total_price_aed) values ('${r.deal}', 2, 99)`)).ok, false); // 2 people already priced
  assert.equal((await attempt(db, P.helper, `insert into public.reel_deal_prices (deal_id, people, total_price_aed) values ('${r.deal}', 0, 99)`)).ok, false);
  assert.equal((await attempt(db, P.helper, `insert into public.reel_deal_prices (deal_id, people, total_price_aed) values ('${r.deal}', 3, -5)`)).ok, false);
});

test("reel offers: title, discount, conditions, optional end date (the old partner offers table is untouched)", async () => {
  await db.exec(reelSql("OF1"));
  const reel = (await db.query("select id from public.reels where link_key = 'instagram/OF1'")).rows[0].id;
  assert.equal((await attempt(db, P.staff, `insert into public.reel_offers (reel_id, title, discount, conditions, end_date) values ('${reel}', 'Weekend treat', '20% off', 'Dine in only', '2026-12-31')`)).ok, true);
  assert.equal((await attempt(db, P.staff, `insert into public.reel_offers (reel_id, title) values ('${reel}', 'Open ended')`)).ok, true);
  assert.equal((await attempt(db, P.staff, `insert into public.reel_offers (reel_id, title) values ('${reel}', '')`)).ok, false);
  const cols = (await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'offers'")).rows.map((x) => x.column_name);
  assert.ok(cols.includes("place_id"), "the old offers table should still be the partner one");
});

test("deleting a reel deletes its items, deals, prices and offers", async () => {
  await db.exec(reelSql("CAS1"));
  const reel = (await db.query("select id from public.reels where link_key = 'instagram/CAS1'")).rows[0].id;
  await db.exec(`
    insert into public.reel_items (reel_id, name, price_aed) values ('${reel}', 'Tea', 5);
    insert into public.reel_offers (reel_id, title) values ('${reel}', 'Offer');
    insert into public.reel_deals (reel_id, title) values ('${reel}', 'Deal');
    insert into public.reel_deal_prices (deal_id, people, total_price_aed) select id, 2, 50 from public.reel_deals where reel_id = '${reel}';
    delete from public.reels where id = '${reel}';
  `);
  for (const t of ["reel_items", "reel_offers", "reel_deals"]) {
    assert.equal((await db.query(`select count(*)::int as n from public.${t} where reel_id = '${reel}'`)).rows[0].n, 0, t);
  }
  assert.equal((await db.query("select count(*)::int as n from public.reel_deal_prices where deal_id not in (select id from public.reel_deals)")).rows[0].n, 0);
});

test("row-level security is on for every new table, and nothing is open to logged-out visitors", async () => {
  const on = (await db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity and relname = any($1)`, [TABLES])).rows;
  assert.equal(on.length, TABLES.length);
  for (const t of TABLES) {
    const open = (await db.query("select has_table_privilege('anon', $1, 'select') as s", [`public.${t}`])).rows[0].s;
    assert.equal(open, false, `${t} is readable by logged-out visitors`);
  }
});
