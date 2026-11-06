import TeamPage from "@/components/admin/TeamPage";

export default function Page() {
  return <TeamPage />;
}

// The page behind the log-in is not drawn until someone logs in, so skip the instant-navigation check.
export const instant = false;
