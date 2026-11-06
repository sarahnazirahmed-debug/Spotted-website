import PinDesk from "@/components/admin/PinDesk";

export default function Page() {
  return <PinDesk />;
}

// The page behind the log-in is not drawn until someone logs in, so skip the instant-navigation check.
export const instant = false;
