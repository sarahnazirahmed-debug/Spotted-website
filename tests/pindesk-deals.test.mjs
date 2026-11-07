// Tests for Step 8: items, deals, offers, time passed, and moving the old offer text over once.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { timeAgo, SEEN_IN_A_REEL } from "../src/lib/timeAgo.ts";
import { cleanDeals, cleanOffers, emptyDeal, money, perPerson, priceLine } from "../src/lib/reelDeals.ts";
import { cleanDishes } from "../src/lib/dishes.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

test("time passed uses at most two units", () => {
  const T = "2026-11-07";
  assert.equal(timeAgo("2026-11-07", T), "today");
  assert.equal(timeAgo("2026-11-06", T), "1 day ago");
  assert.equal(timeAgo("2026-10-26", T), "12 days ago");
  assert.equal(timeAgo("2026-08-28", T), "2 months 10 days ago");
  assert.equal(timeAgo("2025-09-07", T), "1 year 2 months ago");
  assert.equal(timeAgo("2025-11-07", T), "1 year ago");
  assert.equal(timeAgo("2025-11-12", T), "11 months 26 days ago");
  assert.equal(timeAgo("2024-03-01", T), "2 years 8 months ago");
  assert.equal(timeAgo("2026-12-01", T), ""); // the future: nothing
  assert.equal(timeAgo("2026-01-31", "2026-03-01"), "1 month 1 day ago");
  assert.doesNotMatch(timeAgo("2020-01-01", T), /day/); // years never show days
});

test("items: up to 9, name and price", () => {
  const nine = Array.from({ length: 9 }, (_, i) => ({ name: `Item ${i}`, price: "10" }));
  assert.equal(cleanDishes(nine).problem, null);
  assert.match(cleanDishes([...nine, { name: "Tenth", price: "5" }]).problem, /At most 9/);
});

test("a deal needs a title and at least one price line; no repeated group size", () => {
  const d = (o) => ({ ...emptyDeal(), title: "Family feast", prices: [{ people: "2", total: "120" }], ...o });
  assert.equal(cleanDeals([d({})]).problem, null);
  assert.match(cleanDeals([d({ title: "" })]).problem, /needs a title/);
  assert.match(cleanDeals([d({ prices: [{ people: "", total: "" }] })]).problem, /at least one price line/);
  assert.match(cleanDeals([d({ prices: [{ people: "2", total: "" }] })]).problem, /total price/);
  assert.match(cleanDeals([d({ prices: [{ people: "0", total: "5" }] })]).problem, /whole number/);
  assert.match(cleanDeals([d({ prices: [{ people: "2", total: "5" }, { people: "2", total: "6" }] })]).problem, /two price lines/);
  assert.equal(cleanDeals([emptyDeal()]).deals.length, 0); // an untouched box is ignored
  const many = cleanDeals([d({}), d({ title: "Second", endDate: "2026-12-31" })]);
  assert.equal(many.deals.length, 2); // a reel can hold several
  assert.equal(many.deals[1].end_date, "2026-12-31");
  assert.equal(many.deals[0].end_date, null); // end date only when stated
});

test("an offer needs a title and the discount; end date is optional; several allowed", () => {
  const o = (x) => ({ title: "Lunch", discount: "25% off", conditions: "", endDate: "", ...x });
  assert.equal(cleanOffers([o({}), o({ discount: "Buy one get one" })]).offers.length, 2);
  assert.match(cleanOffers([o({ title: "" , discount: "x"})]).problem, /needs a title/);
  assert.match(cleanOffers([o({ discount: "" })]).problem, /discount/);
});

test("both the total and the per-person price are shown", () => {
  assert.equal(perPerson(120, 2), 60);
  assert.equal(money(99.5), "AED 99.50");
  assert.equal(priceLine({ people: 4, total_price_aed: 220 }), "4 people: AED 220 total, AED 55 per person");
  assert.equal(priceLine({ people: 3, total_price_aed: 100 }), "3 people: AED 100 total, AED 33.33 per person");
  assert.equal(priceLine({ people: 1, total_price_aed: 30 }), "1 person: AED 30 total, AED 30 per person");
});

test("the screens show the posted date, time passed and the price warning, and never hide a deal", () => {
  const d = readFileSync("src/components/admin/ReelDetails.tsx", "utf8");
  assert.match(d, /timeAgo\(postedOn\)/);
  assert.match(d, /SEEN_IN_A_REEL/);
  assert.equal(SEEN_IN_A_REEL, "Seen in a reel. Prices may vary.");
  assert.doesNotMatch(d, /end_date\s*[<>]|new Date\(\)/); // no hiding by date
  const form = readFileSync("src/components/admin/ReelForm.tsx", "utf8");
  assert.match(form, /Items seen in the reel/);
  assert.doesNotMatch(form, /htmlFor="rf-offer"/); // the old single offer box is gone
  const extras = readFileSync("src/components/admin/ReelExtras.tsx", "utf8");
  for (const t of ["This reel has a deal", "Reel deal", "Reel offer", "Add a price line", "Add another deal", "Add another offer"]) assert.ok(extras.includes(t), t);
  for (const f of [d, form, extras]) {
    assert.doesNotMatch(f, /#[0-9a-fA-F]{3,8}\b/);
    assert.doesNotMatch(f, /\p{Extended_Pictographic}/u);
  }
});

test("old offer text is moved over once, nothing is deleted, and running it again adds nothing", async () => {
  const db = await makeDb({ skip: ["pindesk_offers.sql"] });
  await db.exec(`insert into public.reels (url, link_key, platform, offer_text, offer_start, offer_end, offer_hours) values
    ('https://www.instagram.com/reel/O1/','instagram/O1','instagram','2 for 1 burgers','2026-10-01','2026-12-31','Mon to Fri, 12 to 4pm'),
    ('https://www.instagram.com/reel/O2/','instagram/O2','instagram',null,null,null,null)`);
  const sql = readFileSync("supabase/pindesk_offers.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const o = (await db.query("select title, conditions, end_date::text from public.reel_offers")).rows;
  assert.equal(o.length, 1);
  assert.equal(o[0].title, "2 for 1 burgers");
  assert.match(o[0].conditions, /Starts: 2026-10-01/);
  assert.match(o[0].conditions, /Hours: Mon to Fri/);
  assert.equal(o[0].end_date, "2026-12-31");
  const kept = (await db.query("select offer_text from public.reels where link_key = 'instagram/O1'")).rows[0].offer_text;
  assert.equal(kept, "2 for 1 burgers");
  // a reel made after the move is not touched by a later run
  await db.exec(`insert into public.reels (url, link_key, platform, offer_text) values ('https://www.instagram.com/reel/O3/','instagram/O3','instagram','late text')`);
  await db.exec(sql);
  assert.equal((await db.query("select count(*)::int n from public.reel_offers")).rows[0].n, 2);
});

test("a deal with price lines and an offer save through the database rules", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "h@example.com"), email: "h@example.com" };
  await db.exec(`insert into public.team_members (email, name, role) values ('h@example.com','Helper','helper');
    insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/D1/','instagram/D1','instagram')`);
  const ok = await attempt(db, who, `
    with r as (select id from public.reels where link_key='instagram/D1'),
    d as (insert into public.reel_deals (reel_id, title) select id, 'Feast' from r returning id),
    p as (insert into public.reel_deal_prices (deal_id, people, total_price_aed) select id, 2, 120 from d union all select id, 4, 220 from d returning 1),
    o as (insert into public.reel_offers (reel_id, title, discount) select id, 'Lunch', '25% off' from r returning 1)
    select (select count(*) from p)::int as prices, (select count(*) from o)::int as offers`);
  assert.ok(ok.ok, ok.error);
  assert.equal(ok.rows[0].prices, 2);
});
