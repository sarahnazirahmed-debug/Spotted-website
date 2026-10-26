import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
