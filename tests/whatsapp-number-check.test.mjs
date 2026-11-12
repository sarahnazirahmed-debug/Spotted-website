// The free WhatsApp number check: the button text is built from the typed number, and the button only shows when a WhatsApp number is set.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyValues, whatsappCheckMessage } from "../src/lib/insiderForm.ts";

test("message names the number the person typed", () => {
  const v = { ...emptyValues(), phone: " +971 50 123 4567 ", sameAsPhone: true };
  assert.match(whatsappCheckMessage(v), /\+971 50 123 4567$/);
});

test("a different WhatsApp number is used when 'same as phone' is off", () => {
  const v = { ...emptyValues(), phone: "+971 50 111 1111", whatsapp: "+971 55 222 2222", sameAsPhone: false };
  assert.match(whatsappCheckMessage(v), /222 2222$/);
});

test("the wizard shows the button only when SMS is off and a WhatsApp number exists", () => {
  const src = readFileSync("src/components/apply/InsiderWizard.tsx", "utf8");
  assert.match(src, /!smsOn && whatsappUrl\(\)/);
  assert.match(src, /whatsappCheckMessage\(v\)/);
});
