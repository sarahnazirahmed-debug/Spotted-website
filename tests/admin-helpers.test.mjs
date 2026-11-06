// Tests for the Pin Desk and Team helpers (links, Google Maps pins, dishes, who may do what).
import test from "node:test";
import assert from "node:assert/strict";
import { readReelLink } from "../src/lib/reelLinks.ts";
import { mapsSearchUrl, readMapsPin } from "../src/lib/mapsLink.ts";
import { cleanDishes } from "../src/lib/dishes.ts";
import { canManage, canOpenTeam, canSeeEarnings, rolesICanGive } from "../src/lib/teamRules.ts";
import { pinProblem } from "../src/lib/pinRules.ts";

// ---- links ----
test("Instagram links are cleaned and get a link key", () => {
  const r = readReelLink("https://www.instagram.com/reel/C8aBc_dE-1/?igsh=abc123&utm_source=x");
  assert.deepEqual(r, { ok: true, platform: "instagram", linkKey: "instagram/C8aBc_dE-1", url: "https://www.instagram.com/reel/C8aBc_dE-1/" });
  assert.equal(readReelLink("instagram.com/p/XYZ/").linkKey, "instagram/XYZ");
  assert.equal(readReelLink("https://www.instagram.com/someone/reel/QQQ/").linkKey, "instagram/QQQ");
});

test("TikTok links give the key and read the @creator", () => {
  const r = readReelLink("https://www.tiktok.com/@food.dubai/video/7301234567890123456?is_from_webapp=1&sender_device=pc");
  assert.deepEqual(r, {
    ok: true,
    platform: "tiktok",
    linkKey: "tiktok/7301234567890123456",
    url: "https://www.tiktok.com/@food.dubai/video/7301234567890123456",
    creator: "@food.dubai",
  });
});

test("short TikTok links ask for the full link", () => {
  const r = readReelLink("https://vm.tiktok.com/ZMabc123/");
  assert.equal(r.ok, false);
  assert.match(r.reason, /full link/);
});

test("YouTube links of every kind give the same key", () => {
  assert.equal(readReelLink("https://www.youtube.com/watch?v=abc_DEF-12&t=30s").linkKey, "youtube/abc_DEF-12");
  assert.equal(readReelLink("https://youtu.be/abc_DEF-12?si=zzz").linkKey, "youtube/abc_DEF-12");
  const s = readReelLink("https://www.youtube.com/shorts/abc_DEF-12");
  assert.equal(s.linkKey, "youtube/abc_DEF-12");
  assert.equal(s.url, "https://www.youtube.com/shorts/abc_DEF-12");
});

test("the same reel pasted two ways has the same key (so duplicates are caught)", () => {
  const a = readReelLink("https://www.instagram.com/reel/AAA/?igsh=1").linkKey;
  const b = readReelLink("instagram.com/reel/AAA").linkKey;
  assert.equal(a, b);
});

test("other links and empty text are refused", () => {
  assert.equal(readReelLink("").ok, false);
  assert.equal(readReelLink("https://example.com/video/1").ok, false);
  assert.equal(readReelLink("https://www.instagram.com/someone/").ok, false);
  assert.equal(readReelLink("not a link at all").ok, false);
});

// ---- Google Maps ----
test("the Google Maps search link", () => {
  assert.equal(
    mapsSearchUrl("Saffron Table", "Khalifa City branch", "Abu Dhabi"),
    "https://www.google.com/maps/search/?api=1&query=Saffron+Table+Khalifa+City+branch+Abu+Dhabi",
  );
  assert.equal(mapsSearchUrl("Cafe", "", "Dubai"), "https://www.google.com/maps/search/?api=1&query=Cafe+Dubai");
});

test("the pin is read from @lat,lng", () => {
  const r = readMapsPin("https://www.google.com/maps/place/Cafe/@24.4217,54.5780,17z/data=abc");
  assert.deepEqual(r, { ok: true, lat: 24.4217, lng: 54.578 });
});

test("the exact pin !3d!4d wins over the map centre", () => {
  const r = readMapsPin("https://www.google.com/maps/place/Cafe/@24.40,54.50,17z/data=!3m1!4b1!4m6!3m5!1s0x0!8m2!3d24.4217!4d54.5780!16s");
  assert.deepEqual(r, { ok: true, lat: 24.4217, lng: 54.578 });
});

test("the pin is read from ?q=lat,lng", () => {
  assert.deepEqual(readMapsPin("https://maps.google.com/?q=25.2048,55.2708"), { ok: true, lat: 25.2048, lng: 55.2708 });
  assert.deepEqual(readMapsPin("https://www.google.com/maps?q=-1.5,-2.5"), { ok: true, lat: -1.5, lng: -2.5 });
});

test("short maps.app.goo.gl links ask for the full link", () => {
  const r = readMapsPin("https://maps.app.goo.gl/AbCdEf123");
  assert.equal(r.ok, false);
  assert.equal(r.needFullLink, true);
});

test("a Maps link with no pin is refused", () => {
  assert.equal(readMapsPin("https://www.google.com/maps/search/cafe").ok, false);
  assert.equal(readMapsPin("").ok, false);
  assert.equal(readMapsPin("https://www.google.com/maps/@95.0,300.0,15z").ok, false);
});

// ---- dishes and pinning ----
test("dishes: up to 9, each with a name and a price", () => {
  assert.deepEqual(cleanDishes([{ name: " Saffron rice ", price: "38" }, { name: "", price: "" }]), { dishes: [{ name: "Saffron rice", price_aed: 38 }], problem: null });
  assert.equal(cleanDishes([{ name: "X", price: "" }]).problem !== null, true);
  assert.equal(cleanDishes([{ name: "X", price: "-5" }]).problem !== null, true);
  assert.equal(cleanDishes([{ name: "", price: "5" }]).problem !== null, true);
  assert.equal(cleanDishes(Array.from({ length: 10 }, (_, i) => ({ name: "D" + i, price: "1" }))).problem !== null, true);
  assert.equal(cleanDishes(Array.from({ length: 9 }, (_, i) => ({ name: "D" + i, price: "1" }))).problem, null);
  assert.equal(cleanDishes([{ name: "Tea", price: "7,5" }]).dishes[0].price_aed, 7.5);
});

test("a reel cannot be pinned without a place and a pin", () => {
  assert.ok(pinProblem({ place_name: "", lat: 1, lng: 1 }));
  assert.ok(pinProblem({ place_name: "Cafe", lat: null, lng: 1 }));
  assert.ok(pinProblem({ place_name: "Cafe", lat: 1, lng: null }));
  assert.equal(pinProblem({ place_name: "Cafe", lat: 24.4, lng: 54.5 }), null);
  assert.equal(pinProblem({ place_name: "Cafe", lat: 0, lng: 0 }), null); // 0,0 is a real number
});

// ---- who may do what ----
test("a helper and staff cannot open Team, and cannot see earnings", () => {
  assert.equal(canOpenTeam("helper"), false);
  assert.equal(canOpenTeam("staff"), false);
  assert.equal(canSeeEarnings("staff"), false);
  assert.equal(canSeeEarnings("helper"), false);
  assert.equal(canOpenTeam("associate"), true);
  assert.equal(canOpenTeam("main_admin"), true);
  assert.equal(canSeeEarnings("associate"), true);
  assert.equal(canOpenTeam(null), false);
});

test("an associate cannot add associates; the main admin can", () => {
  assert.deepEqual(rolesICanGive("associate"), ["staff", "helper"]);
  assert.deepEqual(rolesICanGive("main_admin"), ["associate", "staff", "helper"]);
  assert.deepEqual(rolesICanGive("staff"), []);
  assert.deepEqual(rolesICanGive(null), []);
});

test("nobody can change or remove the main admin", () => {
  for (const me of ["main_admin", "associate", "staff", "helper", null]) assert.equal(canManage(me, "main_admin"), false);
});

test("associates manage only staff and helpers; the main admin manages everyone but themself", () => {
  assert.equal(canManage("associate", "associate"), false);
  assert.equal(canManage("associate", "staff"), true);
  assert.equal(canManage("associate", "helper"), true);
  assert.equal(canManage("main_admin", "associate"), true);
  assert.equal(canManage("staff", "helper"), false);
});

// ---- Excel ----
import { HEADERS, reelsToRows, rowsToReels } from "../src/lib/reelExcel.ts";

const sampleReel = {
  id: "1", url: "https://www.instagram.com/reel/AAA/", link_key: "instagram/AAA", platform: "instagram",
  place_name: "Saffron Table", branch: "Khalifa City", emirate: "Abu Dhabi", country: "UAE", category: "Eat", collection: "Brunch",
  maps_url: "https://www.google.com/maps/@24.4,54.5,17z", lat: 24.4217, lng: 54.578, creator_handle: "@someone",
  dishes: [{ name: "Saffron rice", price_aed: 38 }], offer_text: "Free dessert", offer_start: "2026-12-01", offer_end: "2026-12-31",
  offer_hours: "12-4pm", notes: "nice", status: "pinned", added_by: "Helper", pinned_by: "Staff", created_at: "x", updated_at: "x",
};

test("Excel: what we download can be imported again, and nothing is lost", () => {
  const rows = reelsToRows([sampleReel]);
  assert.deepEqual(rows[0], HEADERS);
  const { items, problems } = rowsToReels(rows);
  assert.deepEqual(problems, []);
  assert.equal(items.length, 1);
  const it = items[0];
  assert.equal(it.link_key, "instagram/AAA");
  assert.equal(it.place_name, "Saffron Table");
  assert.equal(it.status, "pinned");
  assert.equal(it.lat, 24.4217);
  assert.deepEqual(it.dishes, [{ name: "Saffron rice", price_aed: 38 }]);
  assert.equal(it.offer_start, "2026-12-01");
  assert.equal(it.creator_handle, "@someone");
});

test("Excel: duplicates inside the file are skipped, and bad links are reported", () => {
  const rows = [
    ["Link", "Place name"],
    ["https://www.instagram.com/reel/AAA/", "One"],
    ["instagram.com/reel/AAA?igsh=1", "Same again"],
    ["https://example.com/x", "Bad"],
    [null, null],
  ];
  const { items, problems } = rowsToReels(rows);
  assert.equal(items.length, 1);
  assert.equal(problems.length, 2);
});

test("Excel: a Pinned row without a place and pin becomes To check", () => {
  const { items, problems } = rowsToReels([["Link", "Status"], ["https://www.instagram.com/reel/PPP/", "Pinned"]]);
  assert.equal(items[0].status, "to_check");
  assert.match(problems[0], /could not be Pinned/);
});

test("Excel: other column names from an older sheet still work", () => {
  const { items } = rowsToReels([
    ["URL", "Name", "Lat", "Lon", "Dish 1 name", "Dish 1 price", "Status"],
    ["https://www.tiktok.com/@a.b/video/123", "Cafe", "25.1", "55.2", "Tea", "7", "Pinned"],
  ]);
  assert.equal(items[0].link_key, "tiktok/123");
  assert.equal(items[0].creator_handle, "@a.b");
  assert.equal(items[0].status, "pinned");
  assert.deepEqual(items[0].dishes, [{ name: "Tea", price_aed: 7 }]);
});

test("Excel: a file without a Link column is refused", () => {
  assert.equal(rowsToReels([["Name"], ["x"]]).items.length, 0);
});
