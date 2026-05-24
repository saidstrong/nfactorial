import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLACKOUT RAID",
  description: "Survive the AI-directed dungeon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
