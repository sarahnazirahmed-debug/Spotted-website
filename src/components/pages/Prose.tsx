// Simple styled blocks for text pages (about, privacy, terms).
export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-5 py-16 text-lg leading-relaxed text-onpage md:py-24">{children}</div>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-12 text-2xl font-extrabold leading-tight text-heading first:mt-0">{children}</h2>;
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3">{children}</p>;
}
export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 grid list-disc gap-2 pl-6">{children}</ul>;
}
export function Draft({ show, date }: { show: boolean; date: string }) {
  return (
    <div className="mb-10 rounded-2xl bg-alt p-5 text-base font-bold">
      {show && <p>Draft: this page has not been reviewed by a lawyer yet.</p>}
      <p>Last updated: {date}</p>
    </div>
  );
}
