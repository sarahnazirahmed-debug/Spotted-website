// THE ONE FONTS FILE: the heading font and the body font.
// To change a font, change it here, and nowhere else. Example: import `Fraunces` instead of `Poppins`
// for the headings. (Poppins is the placeholder until the brand is decided.)
//
// The two fonts become the CSS variables --font-heading and --font-body (see globals.css).
import { Inter, Merriweather, Poppins } from "next/font/google";

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

// The new draft design (top bar first): Merriweather bold for big public headings and the word "Spotted",
// and Inter for everything else. The rest of the site moves over step by step.
export const brandFont = Merriweather({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
});
export const barFont = Inter({
  variable: "--font-bar",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
