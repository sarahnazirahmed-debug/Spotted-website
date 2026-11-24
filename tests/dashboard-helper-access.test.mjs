import test from "node:test";
import assert from "node:assert/strict";
import { addUser, as, makeDb } from "./helpers-db.mjs";

test("helper access stays in the Pin Desk unless the helper owns member records", async () => {
  const db = await makeDb();
  try {
    const users = {};
    for (const name of ["helper", "partner", "insider", "staff", "associate", "main_admin"]) {
      const email = name + "@example.com";
      users[name] = { email, id: await addUser(db, email) };
      const role = ["partner", "insider"].includes(name) ? "helper" : name;
      await db.query("insert into team_members (email, name, role) values ($1,$2,$3)", [email, name, role]);
    }
    for (const kind of ["partner", "insider"]) {
      for (const email of [users[kind].email, "other-" + kind + "@example.com"]) {
        const { rows: [member] } = await db.query(
          "insert into member_access (email, kind, free_until) values ($1,$2,now() + interval '1 day') returning id", [email, kind]);
        if (kind === "partner") {
          await db.query("insert into partner_items (member_id,name,price_aed) values ($1,'Sample',10)", [member.id]);
          await db.query("insert into partner_offers (member_id,text,starts_on,always_on) values ($1,'Sample',current_date,true)", [member.id]);
        } else {
          await db.query("insert into insider_reels (member_id,url) values ($1,'https://example.com/reel')", [member.id]);
        }
      }
    }
    for (const [role, who] of Object.entries(users)) {
      const teamAccess = ["staff", "associate", "main_admin"].includes(role);
      await as(db, who, async (session) => {
        for (const [table, owner] of [["partner_items","partner"], ["partner_offers","partner"], ["insider_reels","insider"]]) {
          const { rows } = await session.query(`select member_id from ${table}`);
          assert.equal(rows.length, teamAccess ? 2 : role === owner ? 1 : 0);
          if (!teamAccess && rows.length) {
            const own = await session.query("select my_member_id($1) as id", [owner]);
            assert.equal(rows[0].member_id, own.rows[0].id);
          }
        }
        const changed = await session.query("update insider_reels set status = 'checked' returning id");
        assert.equal(changed.rows.length, teamAccess ? 2 : 0);
        if (role === "helper") {
          const added = await session.query("insert into businesses (name,type) values ('Sample Cafe','restaurant') returning id");
          const read = await session.query("select name from businesses where id=$1", [added.rows[0].id]);
          assert.equal(read.rows[0].name, "Sample Cafe");
        }
      });
    }
  } finally {
    await db.close();
  }
});
