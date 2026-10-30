import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import PlacePage from "@/components/business/PlacePage";
import { findPlace, placesFor } from "@/components/business/data";

export function generateStaticParams() {
  return placesFor("shops").map((p) => ({ id: p.id }));
}

async function Place({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The directory is OFF until real partners join: place pages are not reachable.
  const place = FEATURES.businessDirectory ? findPlace("shops", id) : undefined;
  if (!place) notFound();
  return <PlacePage place={place} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Place params={params} />
    </Suspense>
  );
}
