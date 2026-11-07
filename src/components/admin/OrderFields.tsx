"use client";

// "How people get it", and for order-only or both: How to order and Where they deliver.
// THERE IS NO ADDRESS BOX, ON PURPOSE. A home address is never stored or shown. Everything here is optional.
import { ACCESS_LABEL, ADDRESS_NOTE, hasOrdering, looksLikeAddress, type Access, type OrderDraft } from "@/lib/orderOnly";
import { EMIRATES } from "@/lib/pinRules";
import { field, label } from "./ui";

export default function OrderFields({ value, onChange }: { value: OrderDraft; onChange: (v: OrderDraft) => void }) {
  const set = (patch: Partial<OrderDraft>) => onChange({ ...value, ...patch });
  const ordering = hasOrdering({ access_kind: value.access });
  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className={label}>How people get it</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
            <label
              key={a}
              className={`flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 px-3 text-center font-extrabold focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-heading ${value.access === a ? "border-accent bg-accent text-onaccent" : "border-line text-heading"}`}
            >
              <input type="radio" name="access" className="sr-only" checked={value.access === a} onChange={() => set({ access: a })} />
              {ACCESS_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>

      {ordering && (
        <>
          <p role="note" className="rounded-2xl border-2 border-line bg-alt p-3 text-sm font-bold">{ADDRESS_NOTE}</p>

          <fieldset className="grid gap-2">
            <legend className={label}>How to order (any of them)</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
              <input type="checkbox" className="size-6" checked={value.viaInstagram} onChange={(e) => set({ viaInstagram: e.target.checked })} />
              Instagram message
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
              <input type="checkbox" className="size-6" checked={value.viaWhatsapp} onChange={(e) => set({ viaWhatsapp: e.target.checked })} />
              Business WhatsApp
            </label>
            <div>
              <label htmlFor="of-web" className={label}>Website</label>
              <input id="of-web" className={field} value={value.website} onChange={(e) => set({ website: e.target.value })} maxLength={200} autoCapitalize="none" autoComplete="off" />
            </div>
            <div>
              <label htmlFor="of-app" className={label}>App name</label>
              <input id="of-app" className={field} value={value.app} onChange={(e) => set({ app: e.target.value })} maxLength={80} autoComplete="off" />
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className={label}>Where they deliver: emirates</legend>
            <div className="flex flex-wrap gap-2">
              {EMIRATES.map((e) => {
                const on = value.emirates.includes(e);
                return (
                  <label key={e} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 font-bold focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-heading ${on ? "border-accent bg-accent text-onaccent" : "border-line text-heading"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set({ emirates: on ? value.emirates.filter((x) => x !== e) : [...value.emirates, e] })} />
                    {e}
                  </label>
                );
              })}
            </div>
            <div>
              <label htmlFor="of-areas" className={label}>Areas they deliver to (typed, areas only)</label>
              <textarea id="of-areas" rows={2} className={`${field} py-2`} value={value.areas} onChange={(e) => set({ areas: e.target.value })} maxLength={500} placeholder="For example: Khalifa City, Mussafah" />
              {looksLikeAddress(value.areas) && (
                <p role="status" className="mt-1 text-sm font-extrabold text-heading">This looks like an address. Please write the area only. You can still save.</p>
              )}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
