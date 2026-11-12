// App Store and Google Play buttons. They show ONLY when `storeButtons` is switched on in features.ts,
// and each one only when its link is filled in (LAUNCH.stores). Plain words, no store logos.
import { FEATURES, LAUNCH } from "@/config/features";

export default function StoreButtons() {
  if (!FEATURES.storeButtons) return null;
  const items: [string, string][] = [
    ["App Store", LAUNCH.stores.appStore],
    ["Google Play", LAUNCH.stores.googlePlay],
  ];
  const shown = items.filter(([, href]) => href);
  if (shown.length === 0) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {shown.map(([name, href]) => (
        <a
          key={name}
          href={href}
          className="flex min-h-14 items-center rounded-full bg-btn px-8 text-lg font-extrabold text-onbtn transition motion-safe:active:scale-95"
        >
          {name}
        </a>
      ))}
    </div>
  );
}
