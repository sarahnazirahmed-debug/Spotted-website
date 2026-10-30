import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";

// Poppins in the three weights we use: 500 (normal), 700 (bold), 800 (extra bold).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Spotted",
  description: "Save the places you spot. Get reminded when you are nearby.",
};

// Makes the page fit phone screens properly.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6A1FB0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme starts as dark; the script in <head> swaps it to the saved choice before drawing.
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${poppins.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
