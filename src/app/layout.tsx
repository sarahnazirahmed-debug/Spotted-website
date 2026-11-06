import type { Metadata, Viewport } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import { bodyFont, headingFont } from "@/styles/fonts";

export const metadata: Metadata = {
  title: "Spotted",
  description: "Save the places you spot. Get reminded when you are nearby.",
};

// Makes the page fit phone screens properly.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme starts as dark; the script in <head> swaps it to the saved choice before drawing.
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
