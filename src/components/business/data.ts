// Places for the directory (Part B).
// EXAMPLE DATA ONLY: the places below are made up so the design can be tested.
// Every card and page says "EXAMPLE". Replace this list with real partners when they join.
//
// PRIVATE: visit counts are never shown on the website (dashboard only), so they are not stored here.

export type Kind = "restaurants" | "shops";
export type ArtKind = "bowl" | "cup" | "cake" | "shirt" | "gift" | "bag";

export type Place = {
  id: string;
  kind: Kind;
  name: string;
  area: string;
  emirate: string;
  category: string;
  blurb: string;
  signature: string; // the signature dish or item
  art: ArtKind; // the drawn stand-in for the photo / video
  palette: [string, string]; // two brand colours for the background
  offers: string[]; // only the COUNT is shown on cards; the list shows on the place page
  partner: boolean; // a paying Spotted Partner
  saves: number; // how many people saved it (shown only above 100)
  coords: { lat: number; lng: number };
  reels: { handle: string; title: string }[]; // influencer reels about this place
  video?: string; // a 5-10 second muted video of the signature dish (add when real)
};

export const EXAMPLE_PLACES: Place[] = [
  {
    id: "saffron-table",
    kind: "restaurants",
    name: "Saffron Table",
    area: "Khalifa City",
    emirate: "Abu Dhabi",
    category: "Restaurant",
    blurb: "Slow-cooked rice bowls and warm bread, made fresh every morning.",
    signature: "Saffron rice bowl",
    art: "bowl",
    palette: ["#6A1FB0", "#3C096C"],
    offers: ["Free dessert with any main", "Weekday lunch set"],
    partner: true,
    saves: 1240,
    coords: { lat: 24.4217, lng: 54.578 },
    reels: [
      { handle: "@example_foodie", title: "The bowl everyone is saving" },
      { handle: "@example_eats", title: "Sunday lunch at Saffron Table" },
    ],
  },
  {
    id: "date-and-bean",
    kind: "restaurants",
    name: "Date & Bean",
    area: "Al Reem Island",
    emirate: "Abu Dhabi",
    category: "Café",
    blurb: "A small café for date lattes and a quiet corner.",
    signature: "Date latte",
    art: "cup",
    palette: ["#C9A2FF", "#6A1FB0"],
    offers: [],
    partner: false,
    saves: 86,
    coords: { lat: 24.4961, lng: 54.4027 },
    reels: [{ handle: "@example_cafes", title: "Best lattes on the island" }],
  },
  {
    id: "pearl-pastry",
    kind: "restaurants",
    name: "Pearl Pastry",
    area: "Jumeirah",
    emirate: "Dubai",
    category: "Bakery",
    blurb: "Layered cakes and flaky pastries, baked in small batches.",
    signature: "Rose pistachio slice",
    art: "cake",
    palette: ["#E5383B", "#6A1FB0"],
    offers: ["Buy one slice, get one half price"],
    partner: true,
    saves: 340,
    coords: { lat: 25.2048, lng: 55.2708 },
    reels: [{ handle: "@example_sweets", title: "Dessert stop in Jumeirah" }],
  },
  {
    id: "sunrise-grill",
    kind: "restaurants",
    name: "Sunrise Grill",
    area: "Al Majaz",
    emirate: "Sharjah",
    category: "Restaurant",
    blurb: "Charcoal grills and fresh salads by the water.",
    signature: "Charcoal grill plate",
    art: "bowl",
    palette: ["#3C096C", "#E5383B"],
    offers: [],
    partner: false,
    saves: 215,
    coords: { lat: 25.3463, lng: 55.4209 },
    reels: [],
  },
  {
    id: "thread-and-co",
    kind: "shops",
    name: "Thread & Co",
    area: "Khalifa City",
    emirate: "Abu Dhabi",
    category: "Fashion",
    blurb: "Easy everyday pieces in soft colours.",
    signature: "Linen shirt",
    art: "shirt",
    palette: ["#6A1FB0", "#C9A2FF"],
    offers: ["10% off your first visit"],
    partner: true,
    saves: 560,
    coords: { lat: 24.4217, lng: 54.578 },
    reels: [{ handle: "@example_style", title: "Three outfits, one shop" }],
  },
  {
    id: "oud-corner",
    kind: "shops",
    name: "Oud Corner",
    area: "Al Zahiyah",
    emirate: "Abu Dhabi",
    category: "Gifts",
    blurb: "Gift boxes and fragrance, wrapped by hand.",
    signature: "Gift box",
    art: "gift",
    palette: ["#3C096C", "#6A1FB0"],
    offers: [],
    partner: false,
    saves: 92,
    coords: { lat: 24.4955, lng: 54.3773 },
    reels: [],
  },
  {
    id: "bloom-lane",
    kind: "shops",
    name: "Bloom Lane",
    area: "Dubai Marina",
    emirate: "Dubai",
    category: "Home",
    blurb: "Plants, candles and little things for your home.",
    signature: "Candle set",
    art: "bag",
    palette: ["#E5383B", "#3C096C"],
    offers: ["Free wrapping", "2 for 1 on candles", "Student discount"],
    partner: true,
    saves: 1800,
    coords: { lat: 25.0805, lng: 55.1403 },
    reels: [{ handle: "@example_home", title: "Cosy corners from Bloom Lane" }],
  },
];

export const placesFor = (kind: Kind) => EXAMPLE_PLACES.filter((p) => p.kind === kind);
export const findPlace = (kind: Kind, id: string) => EXAMPLE_PLACES.find((p) => p.kind === kind && p.id === id);

// "Saved by" shows only above 100. 1240 -> "1.2K".
export function savedLabel(n: number): string | null {
  if (n <= 100) return null;
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
}
export const offersLabel = (n: number) => (n > 0 ? `${n} ${n === 1 ? "offer" : "offers"}` : null);
