"use client";

// /admin/team (main admin and associates): the people on the team, add a person, change a role,
// remove a person, and the log of who did what. The main admin row has no buttons.
// The website only decides which buttons to show. The database refuses anything that is not allowed.
import { LoadingBlocks } from "@/components/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { titleFor } from "@/lib/pindeskTitle";
import { canManage, canOpenTeam, rolesICanGive, ROLE_LABEL, type TeamRole } from "@/lib/teamRules";
import { isEmail } from "@/lib/signupRules";
import { useAdmin } from "./AdminProvider";

type Member = {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  added_by: string | null;
  added_at: string;
  agreed_confidentiality_at: string | null;
  active: boolean;
};
type LogRow = { id: number; at: string; actor_email: string | null; actor_name: string | null; action: string; target_email: string; target_name: string | null; detail: string | null };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const field = "min-h-11 rounded-xl bg-paper px-3 text-base font-medium text-charcoal outline-none focus:ring-4 focus:ring-accent";

export default function TeamPage() {
  const { supabase, me } = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", name: "", role: "" as TeamRole | "" });
  const myRole = me?.role ?? null;
  const giveable = rolesICanGive(myRole);

  // fetchAll only asks the database; apply puts the answer on the page.
  const fetchAll = useCallback(async () => {
    if (!supabase) return null;
    const [m, l] = await Promise.all([
      supabase.from("team_members").select("*").order("added_at", { ascending: true }),
      supabase.from("team_log").select("*").order("id", { ascending: false }).limit(100),
    ]);
    return { members: (m.data as Member[]) ?? [], log: (l.data as LogRow[]) ?? [] };
  }, [supabase]);
  const apply = (d: { members: Member[]; log: LogRow[] } | null) => {
    if (!d) return;
    setMembers(d.members);
    setLog(d.log);
  };
  const load = async () => apply(await fetchAll());

  useEffect(() => {
    let dead = false;
    void fetchAll().then((d) => {
      if (!dead) apply(d);
    });
    return () => {
      dead = true;
    };
  }, [fetchAll]);

  if (!canOpenTeam(myRole)) return <p className="text-lg">Your role cannot open Team.</p>;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const role = form.role || giveable[0];
    if (!isEmail(form.email)) return setMessage("Please enter a valid email.");
    if (!form.name.trim()) return setMessage("Please enter a name.");
    if (!role || !giveable.includes(role)) return setMessage("You cannot add that role.");
    const { error } = await supabase!.from("team_members").insert({ email: form.email.trim().toLowerCase(), name: form.name.trim(), role });
    if (error) return setMessage(error.code === "23505" ? "That email is already on the team." : "The database did not allow that.");
    setForm({ email: "", name: "", role: "" });
    setMessage("Added. They can log in at /admin with their email and a 6-digit code.");
    await load();
  }

  async function change(m: Member, role: TeamRole) {
    const { error } = await supabase!.from("team_members").update({ role }).eq("id", m.id);
    setMessage(error ? "The database did not allow that." : `${m.name || m.email} is now ${ROLE_LABEL[role]}.`);
    await load();
  }

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name || m.email} from the team?`)) return;
    const { error } = await supabase!.from("team_members").delete().eq("id", m.id);
    setMessage(error ? "The database did not allow that." : `${m.name || m.email} was removed.`);
    await load();
  }

  return (
    <div className="grid gap-10">
      <section>
        <h1 className="text-3xl font-extrabold text-heading">Team</h1>
        {message && (
          <p role="status" className="mt-3 rounded-xl bg-alt p-3 font-bold">
            {message}
          </p>
        )}
        <div className="mt-4 overflow-x-auto rounded-2xl bg-box text-onpanel">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="text-sm text-mist">
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Added by</th>
                <th className="p-3">Confidentiality</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="p-3">
                    <div className="font-extrabold">{m.name || "(no name)"}</div>
                    <div className="text-sm font-bold">{titleFor(m.name, ROLE_LABEL[m.role])}</div>
                    <div className="text-sm text-mist">{m.email}</div>
                  </td>
                  <td className="p-3">
                    {canManage(myRole, m.role) ? (
                      <select aria-label={`Role of ${m.name || m.email}`} value={m.role} onChange={(e) => change(m, e.target.value as TeamRole)} className={field}>
                        {[m.role, ...giveable.filter((r) => r !== m.role)].map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold">{ROLE_LABEL[m.role]}</span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {m.added_by ?? "-"}
                    <div className="text-mist">{when(m.added_at)}</div>
                  </td>
                  <td className="p-3 text-sm">{m.agreed_confidentiality_at ? `Agreed ${when(m.agreed_confidentiality_at)}` : "Not yet"}</td>
                  <td className="p-3 text-right">
                    {canManage(myRole, m.role) && (
                      <button type="button" onClick={() => remove(m)} className="min-h-11 rounded-full border-2 border-line px-4 font-extrabold">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4">
                    <LoadingBlocks rows={2} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold text-heading">Add person</h2>
        <form onSubmit={add} noValidate className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <input aria-label="Email" placeholder="Email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input aria-label="Name" placeholder="Name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select aria-label="Role" className={field} value={form.role || giveable[0]} onChange={(e) => setForm({ ...form, role: e.target.value as TeamRole })}>
            {giveable.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button type="submit" className="min-h-11 rounded-full bg-accent px-6 font-extrabold text-onaccent">
            Add person
          </button>
        </form>
        {myRole === "associate" && <p className="mt-2 text-sm">As an associate you can add staff and helpers.</p>}
      </section>

      <section>
        <h2 className="text-2xl font-extrabold text-heading">Log</h2>
        <ul className="mt-4 grid gap-2">
          {log.map((l) => (
            <li key={l.id} className="rounded-xl bg-alt p-3 text-sm">
              <span className="font-extrabold">{l.actor_name || l.actor_email || "Someone"}</span> {l.action}{" "}
              <span className="font-extrabold">{l.target_name || l.target_email}</span>
              {l.detail ? ` (${l.detail})` : ""} <span className="opacity-70">{when(l.at)}</span>
            </li>
          ))}
          {log.length === 0 && <li className="text-sm">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}
