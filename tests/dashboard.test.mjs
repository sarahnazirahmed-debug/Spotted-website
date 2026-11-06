// Tests for the dashboard maths: periods, example numbers, who sees what, real vs example, Excel/PDF tables.
import test from "node:test";
import assert from "node:assert/strict";
import { bucketRows, periodKeys, periodLabel, periodStart, addPeriods, WINDOW } from "../src/lib/dashboard/time.ts";
import { countryScale, exampleBreakdown, exampleSeries } from "../src/lib/dashboard/example.ts";
import { CARDS } from "../src/lib/dashboard/cards.ts";
import { canOpenDashboard, canSeeMoney, dashboardAccess, visibleCards } from "../src/lib/dashboard/access.ts";
import { computeCard } from "../src/lib/dashboard/compute.ts";
import { cardToTable, sheetNames } from "../src/lib/dashboard/export.ts";
import { makePdf, plain } from "../src/lib/pdf.ts";

const TODAY = "2026-11-05"; // a Thursday

// ---- days, weeks, months ----
test("weeks start on Monday and months on the 1st", () => {
  assert.equal(periodStart("2026-11-05", "week"), "2026-11-02");
  assert.equal(periodStart("2026-11-08", "week"), "2026-11-02"); // Sunday
  assert.equal(periodStart("2026-11-09", "week"), "2026-11-09"); // next Monday
  assert.equal(periodStart("2026-11-05", "month"), "2026-11-01");
  assert.equal(periodStart("2026-11-05", "day"), "2026-11-05");
  assert.equal(addPeriods("2026-11-01", "month", -1), "2026-10-01");
  assert.equal(addPeriods("2026-11-02", "week", 2), "2026-11-16");
});

test("30 days, 12 weeks, 12 months: oldest first, today's period last (or first when looking ahead)", () => {
  for (const g of ["day", "week", "month"]) {
    const past = periodKeys(g, TODAY, "past");
    assert.equal(past.length, WINDOW[g]);
    assert.equal(past[past.length - 1], periodStart(TODAY, g));
    const future = periodKeys(g, TODAY, "future");
    assert.equal(future[0], periodStart(TODAY, g));
    assert.deepEqual([...past].sort(), past);
  }
  assert.equal(periodKeys("day", TODAY)[0], "2026-10-07");
});

test("daily numbers are added up into the right week and month", () => {
  const rows = [
    { day: "2026-11-02", value: 5 }, { day: "2026-11-05", value: 3 }, { day: "2026-11-08", value: 2 }, // one week
    { day: "2026-11-09", value: 7 }, // next week
    { day: "2026-01-01", value: 99 }, // too old: ignored
  ];
  const weeks = periodKeys("week", "2026-11-12");
  const w = bucketRows(rows, "week", weeks);
  assert.equal(w[w.length - 2], 10);
  assert.equal(w[w.length - 1], 7);
  assert.equal(w.reduce((a, b) => a + b, 0), 17);
  const months = bucketRows(rows, "month", periodKeys("month", "2026-11-12"));
  assert.equal(months[months.length - 1], 17);
});

test("period labels are readable", () => {
  assert.equal(periodLabel("2026-11-05", "day"), "5 Nov");
  assert.equal(periodLabel("2026-11-02", "week"), "Week of 2 Nov");
  assert.equal(periodLabel("2026-11-01", "month"), "Nov 2026");
});

// ---- example numbers ----
test("example numbers are the same every time, and differ by country", () => {
  const keys = periodKeys("day", TODAY);
  const a = exampleSeries("x", 50, "day", "ALL", keys);
  assert.deepEqual(a, exampleSeries("x", 50, "day", "ALL", keys));
  assert.notDeepEqual(a, exampleSeries("x", 50, "day", "AE", keys));
  assert.ok(a.every((n) => Number.isInteger(n) && n >= 0));
  assert.ok(countryScale("AE") < 1 && countryScale("AE") > 0);
  assert.equal(countryScale("ALL"), 1);
});

test("a week of example numbers is bigger than a day's (about 7 times)", () => {
  const day = exampleSeries("y", 100, "day", "ALL", ["2026-11-05"])[0];
  const week = exampleSeries("y", 100, "week", "ALL", ["2026-11-02"])[0];
  assert.ok(week > day * 3, `${week} vs ${day}`);
});

test("ranked example lists are sorted, fixed ones keep their order", () => {
  const ranked = exampleBreakdown("p", ["a", "b", "c", "d", "e"], 10, "day", "ALL", true);
  assert.deepEqual(ranked.map((r) => r.value), [...ranked.map((r) => r.value)].sort((x, y) => y - x));
  const fixed = exampleBreakdown("w", ["Mon", "Tue", "Wed"], 10, "day", "ALL", false);
  assert.deepEqual(fixed.map((r) => r.label), ["Mon", "Tue", "Wed"]);
});

// ---- who sees what ----
test("the main admin and associates see every card; staff see counts only, never money; helpers see nothing", () => {
  const all = CARDS.length;
  const money = CARDS.filter((c) => c.money);
  assert.ok(money.length >= 3);
  assert.equal(visibleCards("main_admin").length, all);
  assert.equal(visibleCards("associate").length, all);
  const staff = visibleCards("staff");
  assert.equal(staff.length, all - money.length);
  assert.ok(staff.every((c) => !c.money));
  assert.deepEqual(visibleCards("helper"), []);
  assert.deepEqual(visibleCards(null), []);
  assert.equal(canOpenDashboard("staff"), true);
  assert.equal(canOpenDashboard("helper"), false);
  assert.equal(canSeeMoney("staff"), false);
  assert.equal(canSeeMoney("associate"), true);
  assert.equal(dashboardAccess("main_admin"), "full");
});

test("every card that shows money is marked as money, so staff never get it", () => {
  for (const c of CARDS) {
    const hasAed = c.kind === "series" ? c.series.some((s) => s.aed) : c.kind === "breakdown" ? !!c.aed : false;
    if (hasAed) assert.equal(!!c.money, true, `${c.id} shows AED but is not marked money`);
  }
});

// ---- real versus example ----
const ctx = (over = {}) => ({ country: "ALL", granularity: "day", today: TODAY, real: [], restaurant: "Saffron Table", ...over });
const card = (id) => CARDS.find((c) => c.id === id);

test("a card with a real source shows the real numbers (even when they are zero)", () => {
  const d = computeCard(card("signups"), ctx({ real: [{ metric: "signups", day: "2026-11-05", value: "4" }, { metric: "other", day: "2026-11-05", value: 99 }] }));
  assert.equal(d.source, "real");
  assert.equal(d.series[0].values.at(-1), 4);
  assert.equal(d.series[0].values.reduce((a, b) => a + b, 0), 4);
  const empty = computeCard(card("signups"), ctx());
  assert.equal(empty.source, "real");
  assert.equal(empty.series[0].values.reduce((a, b) => a + b, 0), 0);
});

test("if the real numbers cannot be loaded, the card falls back to labelled EXAMPLE numbers", () => {
  const d = computeCard(card("signups"), ctx({ real: null }));
  assert.equal(d.source, "example");
  assert.ok(d.series[0].values.some((n) => n > 0));
});

test("cards with no real source are always labelled EXAMPLE", () => {
  for (const c of CARDS.filter((x) => x.source === "example")) {
    const d = computeCard(c, ctx({ real: [{ metric: "signups", day: TODAY, value: 1 }] }));
    assert.equal(d.source, "example", c.id);
  }
});

test("trials ending and renewals look ahead", () => {
  const d = computeCard(card("trials_ending"), ctx({ real: [{ metric: "trials_ending", day: "2026-11-20", value: 2 }] }));
  assert.equal(d.keys[0], TODAY);
  assert.equal(d.series[0].values[15], 2);
  assert.equal(computeCard(card("renewals"), ctx()).keys[0], TODAY);
});

test("the retention card shows people who came back after 7 and 30 days (never more than signed up)", () => {
  const d = computeCard(card("retention"), ctx());
  const [cohort, b7, b30] = d.series;
  assert.ok(b7.values.every((n, i) => n <= cohort.values[i]));
  assert.ok(b30.values.every((n, i) => n <= b7.values[i] + 1));
});

test("top cities follow the country, and the country changes the numbers", () => {
  assert.ok(computeCard(card("cities"), ctx({ country: "AE" })).rows.some((r) => r.label === "Abu Dhabi"));
  assert.ok(computeCard(card("cities"), ctx({ country: "SA" })).rows.some((r) => r.label === "Riyadh"));
  const world = computeCard(card("saves"), ctx());
  const ae = computeCard(card("saves"), ctx({ country: "AE" }));
  assert.ok(ae.series[0].values.reduce((a, b) => a + b, 0) < world.series[0].values.reduce((a, b) => a + b, 0));
});

test("each restaurant has its own example numbers", () => {
  const a = computeCard(card("coupons"), ctx({ restaurant: "Saffron Table" }));
  const b = computeCard(card("coupons"), ctx({ restaurant: "Date & Bean" }));
  assert.notDeepEqual(a.series[1].values, b.series[1].values);
});

// ---- tables for Excel and PDF ----
test("a card becomes a plain table (with a Total column when there are several lines)", () => {
  const t = cardToTable(computeCard(card("saves"), ctx({ granularity: "week" })));
  assert.deepEqual(t.header, ["Period", "Instagram", "TikTok", "YouTube", "Total"]);
  assert.equal(t.rows.length, 12);
  assert.equal(t.rows[0][4], t.rows[0][1] + t.rows[0][2] + t.rows[0][3]);
  assert.match(t.note, /EXAMPLE/);
  const real = cardToTable(computeCard(card("signups"), ctx()));
  assert.match(real.note, /^Real data/);
  assert.equal(cardToTable(computeCard(card("earnings"), ctx())).header[1], "Monthly plans (AED)");
});

test("Excel sheet names are short, safe and different", () => {
  const names = sheetNames(["Sign-ups", "Sign-ups", "A/B: very long title that goes past thirty-one letters", "[x]"]);
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, 4);
  assert.ok(names.every((n) => n.length <= 31 && !/[[\]:*?/\\]/.test(n)));
});

// ---- the PDF ----
test("the PDF is a real PDF: right start and end, correct byte positions, pages and text", () => {
  const items = [
    { text: "Spotted dashboard", size: 18, bold: true },
    { text: "A line with (brackets) and a back\\slash" },
    ...Array.from({ length: 140 }, (_, i) => ({ cells: [`Row ${i}`, String(i * 3)], widths: [200, 100] })),
  ];
  const bytes = makePdf(items);
  const s = Buffer.from(bytes).toString("latin1");
  assert.ok(s.startsWith("%PDF-1.4"));
  assert.ok(s.trimEnd().endsWith("%%EOF"));
  const count = Number(s.match(/\/Count (\d+)/)[1]);
  assert.ok(count >= 3, `pages: ${count}`);
  assert.equal((s.match(/\/Type \/Page /g) ?? []).length, count);
  const start = Number(s.match(/startxref\n(\d+)/)[1]);
  assert.ok(s.slice(start).startsWith("xref"));
  const lines = s.slice(start).split("\n");
  const entries = lines.slice(3, 3 + (Number(lines[1].split(" ")[1]) - 1));
  entries.forEach((e, i) => assert.ok(s.slice(Number(e.slice(0, 10))).startsWith(`${i + 1} 0 obj`), `object ${i + 1} is where the table says`));
  assert.ok(s.includes("(Spotted dashboard)"));
  assert.ok(s.includes("\\(brackets\\)"));
  assert.ok(s.includes("back\\\\slash"));
});

test("letters a PDF cannot show are made plain", () => {
  assert.equal(plain("Cote d'Ivoire, Cafe"), "Cote d'Ivoire, Cafe");
  assert.equal(plain("Côte d’Ivoire"), "Cote d'Ivoire");
  assert.equal(plain("Dubai مرحبا"), "Dubai ?????");
});
