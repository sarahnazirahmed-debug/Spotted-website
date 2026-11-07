// Step 11: the Team page and who sees what. The five people, with the roles they are meant to have.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminTabs } from "../src/lib/adminTabs.ts";
import { canSeeMoney, dashboardAccess, visibleCards } from "../src/lib/dashboard/access.ts";
import { CARDS } from "../src/lib/dashboard/cards.ts";
import { canManage, canOpenTeam, ROLE_LABEL, rolesICanGive } from "../src/lib/teamRules.ts";
import { titleFor } from "../src/lib/pindeskTitle.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const TEAM = [
  { name: "Sarah", role: "main_admin", title: "Builder" },
  { name: "Muhammad", role: "associate", title: "Builder" },
  { name: "Abdullah", role: "staff", title: "Builder" },
  { name: "Sadia", role: "helper", title: "Map Crew" },
  { name: "Safia", role: "helper", title: "Map Crew" },
];

test("the words on screen are the titles: Builder and Map Crew", () => {
  for (const p of TEAM) assert.equal(titleFor(p.name, ROLE_LABEL[p.role]), p.title, p.name);
  const team = readFileSync("src/components/admin/TeamPage.tsx", "utf8");
  const frame = readFileSync("src/components/admin/AdminFrame.tsx", "utf8");
  assert.match(team, /titleFor\(m\.name, ROLE_LABEL\[m\.role\]\)/);
  assert.match(frame, /titleFor\(me\.name, ROLE_LABEL\[me\.role\]\)/);
  assert.doesNotMatch(frame, /\{ROLE_LABEL\[me\.role\]\}/); // the top bar no longer prints the role word on its own
});

test("only the words changed: the roles themselves are the same four", () => {
  assert.deepEqual(Object.keys(ROLE_LABEL), ["main_admin", "associate", "staff", "helper"]);
  assert.deepEqual(Object.values(ROLE_LABEL), ["Main admin", "Associate", "Staff", "Helper"]);
});

test("a helper sees only the Pin Desk", () => {
  assert.deepEqual(adminTabs("helper"), ["pin"]);
  assert.equal(dashboardAccess("helper"), "none");
  assert.deepEqual(visibleCards("helper"), []);
  assert.equal(canOpenTeam("helper"), false);
});

test("staff sees the Pin Desk and the counts, never money, and not Team", () => {
  assert.deepEqual(adminTabs("staff"), ["pin", "dashboard"]);
  assert.equal(dashboardAccess("staff"), "counts");
  assert.equal(canSeeMoney("staff"), false);
  const shown = visibleCards("staff");
  assert.ok(shown.length > 0);
  assert.ok(shown.every((c) => !c.money));
  assert.ok(CARDS.some((c) => c.money)); // money cards exist, and are held back from staff
  assert.equal(canOpenTeam("staff"), false);
});

test("the main admin and associates see everything, including Team", () => {
  assert.deepEqual(adminTabs("main_admin"), ["pin", "dashboard", "team"]);
  assert.deepEqual(adminTabs("associate"), ["pin", "dashboard", "team"]);
  assert.equal(canSeeMoney("main_admin"), true);
  assert.equal(canSeeMoney("associate"), true);
  assert.deepEqual(adminTabs(null), []); // someone not on the team sees nothing
});

test("only the main admin and associates can add people, and only the roles below them", () => {
  assert.deepEqual(rolesICanGive("main_admin"), ["associate", "staff", "helper"]);
  assert.deepEqual(rolesICanGive("associate"), ["staff", "helper"]);
  assert.deepEqual(rolesICanGive("staff"), []);
  assert.deepEqual(rolesICanGive("helper"), []);
  assert.deepEqual(rolesICanGive(null), []);
  assert.equal(canManage("main_admin", "main_admin"), false); // the main admin is never changed
  assert.equal(canManage("associate", "associate"), false);
});

// ---------------------------------------------------------------- the real database rules, with the five people
async function setup() {
  const db = await makeDb();
  const P = {};
  for (const p of TEAM) {
    const email = `${p.name.toLowerCase()}@example.com`;
    P[p.name] = { id: await addUser(db, email), email };
    await db.exec(`insert into public.team_members (email, name, role) values ('${email}','${p.name}','${p.role}')`);
  }
  return { db, P };
}
const add = (db, who, email, role) => attempt(db, who, "insert into public.team_members (email, name, role) values ($1,$2,$3) returning id", [email, "New", role]);

test("database: the main admin and associate can add people; staff and helpers cannot", async () => {
  const { db, P } = await setup();
  assert.ok((await add(db, P.Sarah, "a1@example.com", "associate")).ok);
  assert.ok((await add(db, P.Sarah, "a2@example.com", "helper")).ok);
  assert.ok((await add(db, P.Muhammad, "a3@example.com", "staff")).ok);
  assert.ok((await add(db, P.Muhammad, "a4@example.com", "helper")).ok);
  for (const who of [P.Abdullah, P.Sadia, P.Safia]) {
    for (const role of ["helper", "staff", "associate"]) assert.equal((await add(db, who, `x-${role}@example.com`, role)).ok, false, `${role} by a non-admin`);
  }
  assert.equal((await add(db, P.Muhammad, "b1@example.com", "associate")).ok, false); // an associate cannot add an associate
  assert.equal((await add(db, P.Muhammad, "b2@example.com", "main_admin")).ok, false);
  assert.equal((await add(db, P.Sarah, "b3@example.com", "main_admin")).ok, false); // there is only one main admin
  assert.equal((await add(db, null, "b4@example.com", "helper")).ok, false); // a visitor
});

test("database: helpers cannot read the team list, change roles, or open the dashboard numbers", async () => {
  const { db, P } = await setup();
  for (const who of [P.Sadia, P.Safia, P.Abdullah]) {
    assert.equal((await attempt(db, who, "select * from public.team_members")).rows.length, 0, "team list hidden");
    assert.equal((await attempt(db, who, "update public.team_members set role = 'associate' where email = 'sadia@example.com'")).affected, 0);
  }
  assert.ok((await attempt(db, P.Muhammad, "select * from public.team_members")).rows.length >= 5);
  for (const who of [P.Sadia, P.Safia]) {
    const r = await attempt(db, who, "select * from public.dashboard_real('ALL', 30)");
    assert.equal(r.ok, false, "helper must not get dashboard numbers");
  }
  assert.ok((await attempt(db, P.Abdullah, "select * from public.dashboard_real('ALL', 30)")).ok); // staff: counts
});

test("database: the main admin can never be changed or removed, even by an associate", async () => {
  const { db, P } = await setup();
  const r1 = await attempt(db, P.Muhammad, "update public.team_members set role = 'staff' where name = 'Sarah'");
  assert.ok(!r1.ok || r1.affected === 0);
  const r2 = await attempt(db, P.Muhammad, "delete from public.team_members where name = 'Sarah'");
  assert.ok(!r2.ok || r2.affected === 0);
  const r3 = await attempt(db, P.Sarah, "update public.team_members set role = 'staff' where name = 'Sarah'");
  assert.ok(!r3.ok || r3.affected === 0);
  // and nothing changed: Sarah is still the main admin
  assert.equal((await db.query("select role from public.team_members where name = 'Sarah'")).rows[0].role, "main_admin");
});
