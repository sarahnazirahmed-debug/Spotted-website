// The top of a plain page (influencers, careers, about, privacy, terms): the same moving purple
// gradient as the landing section, a chip, a big Poppins headline and one friendly line.
export default function PageHeader({
  chip,
  title,
  lead,
}: {
  chip: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="relative overflow-hidden px-5 pb-16 pt-32 text-white md:pb-24 md:pt-40">
      <div className="hero-bg absolute inset-0" aria-hidden="true">
        <span className="hero-glow hero-glow-a" />
        <span className="hero-glow hero-glow-b" />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <span className="inline-block rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">{chip}</span>
        <h1 className="mt-5 text-[clamp(2.2rem,8vw,4.6rem)] font-extrabold leading-[1.05]">{title}</h1>
        {lead && <p className="mt-5 max-w-xl text-lg leading-relaxed text-lilac">{lead}</p>}
      </div>
    </header>
  );
}
