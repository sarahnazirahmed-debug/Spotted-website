// Tests for the Pins rule (src/lib/pins.ts). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { earnPins } from "../src/lib/pins.ts";

test("AED 12 gives 0 Pins and AED 12 carries over", () => {
  assert.deepEqual(earnPins(12), { pinsEarned: 0, carryAed: 12 });
});

test("the example from the plan: AED 12 then AED 18 = AED 30 = 2 Pins, AED 0 left", () => {
  const first = earnPins(12);
  const second = earnPins(18, first.carryAed);
  assert.deepEqual(second, { pinsEarned: 2, carryAed: 0 });
});

test("exactly AED 15 is 1 Pin with nothing left", () => {
  assert.deepEqual(earnPins(15), { pinsEarned: 1, carryAed: 0 });
});

test("AED 14.99 is not quite a Pin", () => {
  assert.deepEqual(earnPins(14.99), { pinsEarned: 0, carryAed: 14.99 });
});

test("a big bill: AED 100 is 6 Pins with AED 10 left over", () => {
  assert.deepEqual(earnPins(100), { pinsEarned: 6, carryAed: 10 });
});

test("leftover keeps carrying: 10 + 10 + 10 over three bills", () => {
  let carry = 0;
  const pins = [];
  for (let i = 0; i < 3; i++) {
    const r = earnPins(10, carry);
    pins.push(r.pinsEarned);
    carry = r.carryAed;
  }
  assert.deepEqual(pins, [0, 1, 1]);
  assert.equal(carry, 0);
});

test("decimals add up exactly (no 0.1 + 0.2 mistakes)", () => {
  const r = earnPins(7.1, 7.2);
  assert.deepEqual(r, { pinsEarned: 0, carryAed: 14.3 });
});

test("a bill of 0 changes nothing", () => {
  assert.deepEqual(earnPins(0, 9), { pinsEarned: 0, carryAed: 9 });
});

test("bad numbers are refused", () => {
  assert.throws(() => earnPins(-1), RangeError);
  assert.throws(() => earnPins(NaN), RangeError);
  assert.throws(() => earnPins(10, -5), RangeError);
});
