"use client";

// The change log for one row (and the rows that belong to it): who changed what, and when.
import { LoadingBlocks } from "@/components/Skeleton";
import { useEffect, useState } from "react";
import { describeChange, niceDateTime } from "@/lib/listRules";
import { useAdmin } from "./AdminProvider";

type Entry = { id: number; table_name: string; action: string; label: string | null; changes: Record<string, { from: unknown; to: unknown }>; changed_by: string; changed_at: string };

export default function ChangeHistory({ rowId, version }: { rowId: string; version: number }) {
  const { supabase } = useAdmin();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!supabase || !rowId) return;
      const { data } = await supabase.from("change_log").select("id, table_name, action, label, changes, changed_by, changed_at").or(`row_id.eq.${rowId},parent_id.eq.${rowId}`).order("changed_at", { ascending: false }).limit(200);
      if (!dead) setEntries((data as Entry[] | null) ?? []);
    })();
    return () => {
      dead = true;
    };
  }, [supabase, rowId, version]);
  return (
    <section className="grid gap-2">
      <h2 className="text-2xl font-extrabold text-heading">History</h2>
      {entries === null && <LoadingBlocks rows={2} />}
      {entries?.length === 0 && <p className="font-bold">No changes logged yet.</p>}
      <ul className="grid gap-2">
        {entries?.map((e) => (
          <li key={e.id} className="rounded-xl bg-alt p-3 text-sm">
            <p className="font-bold">{niceDateTime(e.changed_at)} · {e.changed_by}</p>
            <p className="break-words">{describeChange(e, e.table_name)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
