// Tests for the sign-up checks (src/lib/signupRules.ts). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { birthdayProblem, isCode, isEmail, isPhone } from "../src/lib/signupRules.ts";

const today = new Date("2026-10-30T12:00:00Z");

test("emails", () => {
  assert.equal(isEmail("a@b.com"), true);
  assert.equal(isEmail("a@b"), false);
  assert.equal(isEmail("no spaces@b.com"), false);
});

test("phone and WhatsApp numbers", () => {
  assert.equal(isPhone("+971 50 123 4567"), true);
  assert.equal(isPhone("0508733160"), true);
  assert.equal(isPhone("12345"), false);
  assert.equal(isPhone("call me"), false);
});

test("one-time codes are 6 to 8 digits", () => {
  assert.equal(isCode("123456"), true);
  assert.equal(isCode("12345678"), true);
  assert.equal(isCode("12345"), false);
  assert.equal(isCode("12a456"), false);
});

test("birthday is optional", () => {
  assert.equal(birthdayProblem("", today), null);
});

test("a normal birthday is fine", () => {
  assert.equal(birthdayProblem("1995-04-12", today), null);
});

test("a birthday in the future is refused", () => {
  assert.ok(birthdayProblem("2030-01-01", today));
});

test("a date that does not exist is refused", () => {
  assert.ok(birthdayProblem("2020-02-31", today));
});

test("under 13 is refused, exactly 13 is fine", () => {
  assert.ok(birthdayProblem("2015-01-01", today));
  assert.equal(birthdayProblem("2013-10-30", today), null);
  assert.ok(birthdayProblem("2013-10-31", today));
});
