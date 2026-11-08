// Step 6 (Insider and Partner dashboards, website part). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reelProblem, itemProblem, offerProblem, offerIsLive, dashboardPath, todayIso } from "../src/lib/memberRules.ts";
import { destinationFor } from "../src/lib/loginRoute.ts";

const read = (f) => readFileSync(f, "utf8");

test("a reel needs a link; the name and date are optional", () => {
  assert.match(reelProblem({ url: "", placeName: "" }), /reel link/);
  assert.match(reelProblem({ url: "not a link", placeName: "" }), /https/);
  assert.equal(reelProblem({ url: "https://www.instagram.com/reel/abc/", placeName: "" }), null);
});

test("an item needs a name and a price in AED", () => {
  assert.match(itemProblem({ name: "", price: "5" }), /name/);
  assert.match(itemProblem({ name: "Tea", price: "abc" }), /price/);
  assert.match(itemProblem({ name: "Tea", price: "-3" }), /price/);
  assert.equal(itemProblem({ name: "Tea", price: "12.50" }), null);
  assert.equal(itemProblem({ name: "Tea", price: "0" }), null);
});

test("an offer needs text, a start date, and an end date or the always-on tick", () => {
  const ok = { text: "Free cake", startsOn: "2026-12-01", endsOn: "2026-12-10", alwaysOn: false };
  assert.equal(offerProblem(ok), null);
  assert.equal(offerProblem({ ...ok, endsOn: "", alwaysOn: true }), null);
  assert.match(offerProblem({ ...ok, endsOn: "" }), /end date/);
  assert.match(offerProblem({ ...ok, endsOn: "2026-11-01" }), /before/);
  assert.match(offerProblem({ ...ok, text: "" }), /offer/);
});

test("an offer is live between its dates, or always when always on", () => {
  assert.equal(offerIsLive({ starts_on: "2026-12-01", ends_on: "2026-12-10", always_on: false }, "2026-12-05"), true);
  assert.equal(offerIsLive({ starts_on: "2026-12-01", ends_on: "2026-12-10", always_on: false }, "2026-12-11"), false);
  assert.equal(offerIsLive({ starts_on: "2026-12-01", ends_on: null, always_on: true }, "2027-05-05"), true);
  assert.equal(offerIsLive({ starts_on: "2026-12-06", ends_on: null, always_on: true }, "2026-12-05"), false);
  assert.match(todayIso(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test("each kind of member has their own dashboard, and the log-in sends them there", () => {
  assert.equal(dashboardPath("insider"), "/dashboard/insider");
  assert.equal(dashboardPath("partner"), "/dashboard");
  assert.equal(destinationFor(false, "influencer"), "/dashboard/insider");
  assert.equal(destinationFor(false, "restaurant"), "/dashboard");
  assert.match(read("src/components/account/LoginForm.tsx"), /rpc\("my_access"\)/);
});

test("the Insider dashboard has the five cards, the Add a reel box, My reels, the waiting chip and Remove", () => {
  const f = read("src/components/dashboard/InsiderDashboard.tsx");
  for (const w of ["t.greenStars", "t.yellowStars", "t.saves", "t.reelsAdded", "t.amount", "t.addReelTitle", "t.myReels", "t.waiting", "t.remove"]) assert.ok(f.includes(w), w);
  assert.match(f, /order\("created_at", \{ ascending: false \}\)/); // newest first
  assert.match(f, /amount_range/); // money only as a range
  assert.doesNotMatch(f, /amount_generated/);
  const en = read("src/content/en.ts");
  for (const w of ["Waiting for our check", "Amount generated", "Reels added by you", "Add a reel"]) assert.ok(en.includes(w), w);
});

test("the Partner dashboard has the five cards, and Items and Offers side by side, with the always-on tick box", () => {
  const f = read("src/components/dashboard/PartnerDashboard.tsx");
  for (const w of ["t.greenStars", "t.yellowStars", "t.salesRecorded", "t.saves", "t.items", "t.offersLive", "t.itemsTitle", "t.offersTitle", "t.noEnd"]) assert.ok(f.includes(w), w);
  assert.match(f, /md:grid-cols-2/); // side by side
  const en = read("src/content/en.ts");
  for (const w of ["Sales recorded through Spotted", "No end date (always on)", "Offers live", "Price (AED)"]) assert.ok(en.includes(w), w);
});

test("the dashboards have a Log out button and show 'paid until' only once payment exists; the access-ended message keeps the data", () => {
  const f = read("src/components/dashboard/DashboardFrame.tsx");
  assert.match(f, /t\.logOut/);
  assert.match(f, /if \(!n\?\.paid_until\) return null/);
  assert.match(read("src/content/en.ts"), /Your free period has ended\. Your data is saved\./);
});

test("the admin area asks for the Founding free months and can change a member's free period", () => {
  const f = read("src/components/admin/ApplicationsPage.tsx");
  assert.match(f, /founding_free_months/);
  assert.match(f, /rpc\("set_free_period"/);
  const sql = read("supabase/dashboards.sql");
  assert.match(sql, /months := 2;/);
  assert.match(sql, /Please type the free months for this Founding Insider/);
});

test("no emoji in the new files", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ["InsiderDashboard", "PartnerDashboard", "DashboardFrame", "useMember"]) assert.doesNotMatch(read(`src/components/dashboard/${f}.${f === "useMember" ? "ts" : "tsx"}`), emoji, f);
});
