// A page for a Pin Desk screen that is not built yet. Each one is replaced when its step is done.
import Link from "next/link";

export default function AdminComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold text-heading">{title}</h1>
      <p className="mt-4 text-xl font-bold">Coming soon.</p>
      <Link href="/admin" className="mt-8 inline-flex min-h-12 items-center rounded-full border-2 border-line px-6 text-lg font-extrabold text-heading hover:bg-alt">
        Back to the Pin Desk
      </Link>
    </div>
  );
}
