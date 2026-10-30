// THE PINS RULE: 1 Pin for every AED 15 of the bill. The money left over carries over to the next bill.
//
// Example: a bill of AED 12 gives 0 Pins (AED 12 left over). Then a bill of AED 18 makes AED 30 in
// total, which is 2 Pins, with AED 0 left over.
//
// Money is counted in fils (1 AED = 100 fils) so there are no rounding mistakes with decimals.

export const AED_PER_PIN = 15;
const FILS_PER_AED = 100;
const FILS_PER_PIN = AED_PER_PIN * FILS_PER_AED;

export type PinsResult = {
  pinsEarned: number; // whole Pins earned by THIS bill
  carryAed: number; // money left over, to add to the next bill
};

// AED (can have decimals, like 12.5) to whole fils.
const toFils = (aed: number) => Math.round(aed * FILS_PER_AED);

// carryAed = what was left over after the last bill (0 for a first bill).
export function earnPins(billAed: number, carryAed = 0): PinsResult {
  if (!Number.isFinite(billAed) || billAed < 0) throw new RangeError("The bill must be a number that is 0 or more.");
  if (!Number.isFinite(carryAed) || carryAed < 0) throw new RangeError("The carry-over must be a number that is 0 or more.");
  const total = toFils(billAed) + toFils(carryAed);
  return {
    pinsEarned: Math.floor(total / FILS_PER_PIN),
    carryAed: (total % FILS_PER_PIN) / FILS_PER_AED,
  };
}
