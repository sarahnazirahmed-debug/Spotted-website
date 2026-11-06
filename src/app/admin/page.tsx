import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/pin");
}

// The page behind the log-in is not drawn until someone logs in, so skip the instant-navigation check.
export const instant = false;
