// Tests for Step 6: the "Add location" form rules, and saving through the real database rules.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { locationProblem, mapsUrlToSave, parsePlaces } from "../src/lib/locationRules.ts";
import { readMapsPin } from "../src/lib/mapsLink.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

test("places: one per line, blanks and repeats dropped", () => {
  const r = parsePlaces("Zara\n\n  H&M  \r\nzara\nCinema");
  assert.deepEqual(r.places, ["Zara", "H&M", "Cinema"]);
  assert.equal(r.repeats, 1);
  assert.equal(r.problem, null);
});

test("500 places are fine, 501 are not, a very long line is not", () => {
  const n = (k) => Array.from({ length: k }, (_, i) => `Shop ${i}`).join("\n");
  assert.equal(parsePlaces(n(500)).problem, null);
  assert.match(parsePlaces(n(501)).problem, /at most 500/);
  assert.match(parsePlaces("x".repeat(161)).problem, /too long/);
});

test("a name is needed; the places are only checked when the building switch is on", () => {
  assert.match(locationProblem({ name: " ", building: false, placesText: "" }), /name/i);
  assert.equal(locationProblem({ name: "Mall", building: false, placesText: "x".repeat(200) }), null);
  assert.match(locationProblem({ name: "Mall", building: true, placesText: "x".repeat(200) }), /too long/);
});

test("the Maps link is saved with https and the existing pin reader is used", () => {
  assert.equal(mapsUrlToSave("http://www.google.com/maps/@24.4,54.5,17z"), "https://www.google.com/maps/@24.4,54.5,17z");
  assert.equal(mapsUrlToSave("google.com/maps"), "https://google.com/maps");
  assert.equal(mapsUrlToSave("  "), null);
  assert.equal(readMapsPin("https://www.google.com/maps/@24.4,54.5,17z").ok, true);
  const src = readFileSync("src/components/admin/AddLocation.tsx", "utf8");
  assert.match(src, /readMapsPin/);
  const insert = src.match(/\.from\("locations"\)\s*\.insert\(\{([\s\S]*?)\}\)/)[1];
  assert.doesNotMatch(insert, /\bcode\b/); // the code is made by the database, never sent
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/);
});

test("saving a location and its places works in the database; a plain location cannot have places", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "main@example.com"), email: "main@example.com" };
  await db.exec("insert into public.team_members (email, name, role) values ('main@example.com','Main','main_admin')");
  const r = await attempt(db, who, `
    with l as (insert into public.locations (name, emirate, is_building, maps_url, lat, lng) values ('Yas Mall','Abu Dhabi',true,'https://www.google.com/maps/@24.4,54.6,17z',24.4,54.6) returning id, code)
    insert into public.building_places (location_id, name) select id, 'Zara' from l union all select id, 'Cinema' from l returning (select code from l) as code`);
  assert.ok(r.ok, r.error);
  assert.match(r.rows[0].code, /^[A-HJ-NP-Z]{10}[2-9]{10}$/);
  const plain = await attempt(db, who, `
    with l as (insert into public.locations (name) values ('Corner cafe') returning id)
    insert into public.building_places (location_id, name) select id, 'Zara' from l`);
  assert.equal(plain.ok, false);
});
