import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-планер дня",
  description: "Вивантаж усе з голови — AI перетворить це на задачі.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F7F6F2", // Soft Daylight — warm milk
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <head>
        {/* SKELAR primary typeface — Inter via the author's official CDN */}
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
