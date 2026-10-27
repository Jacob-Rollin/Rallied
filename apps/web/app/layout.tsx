import type { Metadata } from "next";
import { Archivo_Black, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rallied — LFG that remembers who flakes",
  description:
    "Discord LFG + per-server Vibe Check / Ghostless reliability. Parties, vibes, fewer ghosts.",
  icons: {
    icon: "/brand/rallied-square-dark.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
