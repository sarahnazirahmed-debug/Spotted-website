// Tests for Step 5: the "Add restaurant or shop" form rules, and saving through the real database rules.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  businessProblem, cleanHandle, KINDS, kindToSave, plainName, similarNames, RESTAURANT_KINDS, SHOP_KINDS,
} from "../src/lib/businessRules.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const ok = { name: "Cafe Noor", type: "restaurant", kind: "Cafe", otherKind: "", instagram: "", email: "", whatsapp: "" };

test("the kinds are the ones asked for", () => {
  assert.deepEqual(RESTAURANT_KINDS, ["Restaurant", "Cafe", "Cafeteria", "Bakery", "Sweets", "Cloud kitchen", "Home kitchen"]);
  assert.equal(SHOP_KINDS.length, 8);
  assert.ok(KINDS.shop.includes("Other") && !KINDS.restaurant.includes("Other"));
});

test("name and type are needed, other kinds of shop must be typed", () => {
  assert.equal(businessProblem(ok), null);
  assert.match(businessProblem({ ...ok, name: "  " }), /name/i);
  assert.match(businessProblem({ ...ok, type: "" }), /Restaurant or Shop/);
  assert.match(businessProblem({ ...ok, type: "shop", kind: "Other" }), /kind of shop/);
  assert.equal(kindToSave("shop", "Other", " Toys "), "Toys");
  assert.equal(kindToSave("restaurant", "", ""), null);
});

test("Instagram handles are cleaned", () => {
  assert.equal(cleanHandle("@Some.Place"), "some.place");
  assert.equal(cleanHandle("https://www.instagram.com/Some.Place/?igsh=abc"), "some.place");
  assert.equal(cleanHandle("instagram.com/x_y"), "x_y");
  assert.match(businessProblem({ ...ok, instagram: "not a handle!" }), /Instagram/);
});

test("email and WhatsApp are checked", () => {
  assert.match(businessProblem({ ...ok, email: "nope" }), /email/);
  assert.match(businessProblem({ ...ok, whatsapp: "abc" }), /WhatsApp/);
  assert.equal(businessProblem({ ...ok, email: "hi@shop.ae", whatsapp: "+971 50 123 4567" }), null);
});

test("similar names are found, different ones are not", () => {
  const list = [{ name: "The Coffee House" }, { name: "Al Noor Bakery" }, { name: "Zaatar W Zeit" }, { name: "Tea" }];
  assert.equal(plainName("The Coffee  House!"), "coffeehouse");
  assert.deepEqual(similarNames("coffee house", list).map((x) => x.name), ["The Coffee House"]);
  assert.deepEqual(similarNames("Coffe House", list).map((x) => x.name), ["The Coffee House"]); // a typo
  assert.deepEqual(similarNames("Noor Bakery", list).map((x) => x.name), ["Al Noor Bakery"]); // one inside the other
  assert.deepEqual(similarNames("Pizza Place", list), []);
  assert.deepEqual(similarNames("T", list), []);
});

test("the form sends only business facts and never a code", () => {
  const src = readFileSync("src/components/admin/AddBusiness.tsx", "utf8");
  assert.doesNotMatch(src, /code:\s*[^,\n]*,\s*\n/); // no code field in the insert
  assert.match(src, /\.select\("code, name"\)/); // the new code is read back after saving
  assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(src, /\p{Extended_Pictographic}/u);
});

test("saving a business gives it a code, and the database tidies the form's values", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "main@example.com"), email: "main@example.com" };
  await db.exec("insert into public.team_members (email, name, role) values ('main@example.com','Main','main_admin')");
  const r = await attempt(
    db, who,
    `insert into public.businesses (name, type, subtype, instagram_handle, business_email, business_whatsapp)
     values ($1,$2,$3,$4,$5,$6) returning code, name, business_email`,
    ["  Cafe Noor ", "restaurant", "Cafe", "cafe.noor", "Hi@Cafe.ae", "+971 50 123 4567"],
  );
  assert.ok(r.ok, r.error);
  assert.match(r.rows[0].code, /^[A-HJ-NP-Z]{4}[2-9]{4}$/);
  assert.equal(r.rows[0].name, "Cafe Noor");
  assert.equal(r.rows[0].business_email, "hi@cafe.ae");
});
