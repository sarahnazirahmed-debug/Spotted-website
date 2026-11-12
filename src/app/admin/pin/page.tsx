import PinDesk from "@/components/admin/PinDesk";

// The Pin Desk is for a laptop or desktop (the form, the list and the map need room).
// On a phone or a small tablet we show a plain message instead, so nobody struggles with tiny boxes.
export default function Page() {
  return (
    <>
      <p role="note" className="rounded-2xl bg-alt p-4 text-lg font-bold text-heading lg:hidden">
        The Pin Desk works on a laptop or a desktop computer. Please open this page there.
      </p>
      <div className="hidden lg:block">
        <PinDesk />
      </div>
    </>
  );
}
