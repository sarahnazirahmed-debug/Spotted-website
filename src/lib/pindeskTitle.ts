// The title shown under a person's name on the Pin Desk home page.
import { TITLES_BY_FIRST_NAME } from "../config/pindeskTitles.ts";

export function titleFor(name: string, roleLabel: string): string {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return TITLES_BY_FIRST_NAME[first] ?? roleLabel;
}
