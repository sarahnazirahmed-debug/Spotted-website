// A few simple icons (objects only: no people, no faces). They take their colour from the text colour.
const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export type IconName = "bookmark" | "pin" | "globe" | "bell" | "qr" | "star" | "chart" | "arrow";

export function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  const p = { ...common, width: size, height: size };
  switch (name) {
    case "bookmark":
      return (
        <svg {...p}>
          <path d="M6 3h12v18l-6-5-6 5z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...p}>
          <path d="M12 21c-5-5.5-7-9-7-12a7 7 0 0 1 14 0c0 3-2 6.500-7 12z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
          <path d="M4.500 7.500h15M4.500 16.500h15" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "qr":
      return (
        <svg {...p}>
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM18 18h2v2h-2zM14 19v1M20 14v1" />
        </svg>
      );
    case "star":
      return (
        <svg {...p}>
          <path d="M12 3l2.800 5.800 6.200.8-4.600 4.300 1.200 6.100L12 17l-5.600 3 1.200-6.100L3 9.600l6.200-.8z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
  }
}
