// Tests for where the single Log in page sends people (src/lib/loginRoute.ts). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { destinationFor } from "../src/lib/loginRoute.ts";

test("owner or crew go to the admin area", () => {
  assert.equal(destinationFor(true, null), "/admin");
  assert.equal(destinationFor(true, "shop"), "/admin");
});
test("an Insider goes to the Insider dashboard", () => {
  assert.equal(destinationFor(false, "influencer"), "/dashboard/insider");
});
test("a Partner (restaurant or shop) goes to the Partner dashboard", () => {
  assert.equal(destinationFor(false, "restaurant"), "/dashboard");
  assert.equal(destinationFor(false, "shop"), "/dashboard");
});
test("an unknown email goes nowhere (the page shows the polite message)", () => {
  assert.equal(destinationFor(false, null), null);
});

const text = (f) => readFileSync(f, "utf8");
test("the unknown-email message is the agreed one, from the text file", () => {
  assert.match(text("src/content/en.ts"), /We could not find this email\. Apply to become an Insider or Partner\./);
});
test("the top bar has the four links in order, Log in opens /login and Sign up opens /signup", () => {
  const bar = text("src/components/TopBar.tsx");
  const order = ["n.howItWorks", "n.faqs", "n.insiders", "n.partners"];
  let at = -1;
  for (const k of order) {
    const i = bar.indexOf(`label: ${k}`);
    assert.ok(i > at, `${k} missing or out of order`);
    at = i;
  }
  assert.match(bar, /label: n\.logIn, href: "\/login"/);
  assert.match(bar, /label: n\.signUp, href: "\/signup"/);
  assert.doesNotMatch(bar, /yourData|n\.admin/);
  assert.doesNotMatch(bar, /getNotified|GET_NOTIFIED/); // there is no Get notified button any more
});
test("the admin pages send a visitor who is not logged in to /login", () => {
  assert.match(text("src/components/admin/AdminFrame.tsx"), /router\.replace\("\/login"\)/);
});
test("the Insiders, Partners and Log in switches are ON, and Careers exists but is hidden (step 8)", () => {
  const f = text("src/config/features.ts");
  for (const k of ["insiderPage", "businessPages", "loginPage"]) assert.match(f, new RegExp(`${k}: true`), k);
  assert.match(f, /careersPage: false/);
});
