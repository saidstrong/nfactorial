import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

const displayFont = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800", "900"],
});

const bodyFont = Rajdhani({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BLACKOUT RAID",
  description:
    "Browser-based cyber raid shooter with AI-directed mission briefings, upgrade choices, and the Blackout Core boss.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
