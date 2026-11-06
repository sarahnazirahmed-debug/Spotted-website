// Which language the site uses. Only English for now. To add one: create the file (for example ar.ts,
// a translated copy of en.ts), import it here, and add it to LANGUAGES.
import { en, type Content } from "./en";

export const LANGUAGES: Record<string, Content> = { en };
export const DEFAULT_LANGUAGE = "en";

// Every page reads its words from here.
export const text: Content = LANGUAGES[DEFAULT_LANGUAGE];
