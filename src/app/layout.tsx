import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLACKOUT GRID",
  description: "Restore the city grid before the blackout spreads.",
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
