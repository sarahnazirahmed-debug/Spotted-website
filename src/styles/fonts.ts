// THE ONE FONTS FILE: the heading font and the body font.
// To change a font, change it here, and nowhere else. Example: import `Fraunces` instead of `Poppins`
// for the headings. (Poppins is the placeholder until the brand is decided.)
//
// The two fonts become the CSS variables --font-heading and --font-body (see globals.css).
import { Poppins } from "next/font/google";

// Big headlines and the words printed on the 3D banner.
export const headingFont = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

// Everything else: paragraphs, buttons, forms.
export const bodyFont = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});
