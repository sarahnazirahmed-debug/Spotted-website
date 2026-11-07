// Tests for the Pin Desk home page (Step 4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { titleFor } from "../src/lib/pindeskTitle.ts";

const home = readFileSync("src/components/admin/PinDeskHome.tsx", "utf8");

test("Sarah, Muhammad and Abdullah are Builders", () => {
  for (const n of ["Sarah", "Muhammad Ali", "abdullah", "  SARAH Ahmed "]) assert.equal(titleFor(n, "Staff"), "Builder");
});

test("Sadia and Safia are Map Crew", () => {
  for (const n of ["Sadia", "safia Khan"]) assert.equal(titleFor(n, "Helper"), "Map Crew");
});

test("anyone else shows their team role", () => {
  assert.equal(titleFor("Zed", "Helper"), "Helper");
  assert.equal(titleFor("", "Staff"), "Staff");
});

test("home page has the three big bars, the four links and the greyed row", () => {
  for (const t of ["Add reel", "Add restaurant or shop", "Add location", "Locations", "Restaurants", "Reels", "Incomplete", "Offers and loyalty cards, Phase 3"])
    assert.ok(home.includes(t), t);
  assert.ok(home.includes("Spotted"));
});

test("home page uses no colour codes, no emoji and no animation", () => {
  assert.doesNotMatch(home, /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  assert.doesNotMatch(home, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(home, /animate-|transition|duration-/);
});

test("every bar and link is at least 44px tall", () => {
  const heights = [...home.matchAll(/min-h-(\d+)/g)].map((m) => Number(m[1]) * 4);
  assert.ok(heights.length >= 3);
  for (const h of heights) assert.ok(h >= 44, `min-h is ${h}px`);
});

test("every link on the home page has a page behind it", () => {
  for (const m of home.matchAll(/href: "(\/admin[^"?]*)/g)) {
    const path = m[1] === "/admin" ? "src/app/admin/page.tsx" : `src/app${m[1]}/page.tsx`;
    assert.doesNotThrow(() => readFileSync(path), path);
  }
});
