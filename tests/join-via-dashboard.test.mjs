// The dashboard's Join forms are the one way to apply. This site's own Apply page is OFF, so nobody fills in a form that cannot save.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FEATURES } from "../src/config/features.ts";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("this site's own Apply page is OFF, and its pages show the 404 page while it is off", () => {
  assert.equal(FEATURES.applyPage, false);
  assert.match(read("src/app/apply/page.tsx"), /if \(!FEATURES\.applyPage\) notFound\(\)/);
  assert.match(read("src/app/apply/thanks/page.tsx"), /if \(!FEATURES\.applyPage\) notFound\(\)/);
});

test("with the dashboard address set, every Join button goes to the dashboard forms, even while the Apply page is OFF", async () => {
  process.env.NEXT_PUBLIC_JOIN_URL = "https://dashboard.example.com/";
  const r = await import("../src/config/routes.ts?dashboard-set");
  assert.equal(r.partnerLink("insider"), "https://dashboard.example.com/#/join/insider");
  assert.equal(r.partnerLink("restaurants"), "https://dashboard.example.com/#/join/partner");
  assert.equal(r.partnerLink("shops"), "https://dashboard.example.com/#/join/partner");
  assert.equal(r.foundingLink(), "https://dashboard.example.com/#/join/insider"); // founding is a choice inside the Insider form
  delete process.env.NEXT_PUBLIC_JOIN_URL;
});

test("without the dashboard address, no button leads to a form that cannot save: they go to the Contact or landing pages", async () => {
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  const r = await import("../src/config/routes.ts?dashboard-not-set");
  for (const page of ["insider", "restaurants", "shops"]) {
    const href = r.partnerLink(page);
    assert.doesNotMatch(href, /^\/apply/, `${page} must not go to /apply`);
  }
  assert.doesNotMatch(r.foundingLink(), /^\/apply/);
  assert.equal(r.foundingLink(), "/contact");
});

test("the Founding Insider button uses the new link, and the old Apply form is still in the code (switched off, not deleted)", () => {
  assert.match(read("src/components/insider/InsiderLanding.tsx"), /href=\{foundingLink\(\)\}/);
  assert.ok(existsSync(new URL("../src/components/apply/InsiderWizard.tsx", import.meta.url)));
});
