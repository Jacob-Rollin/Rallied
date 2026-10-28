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
    icon: [
      { url: "/brand/rallied-favicon-32.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/brand/rallied-square-dark.jpg", type: "image/jpeg" },
    ],
  },
  openGraph: {
    title: "Rallied — LFG that remembers who flakes",
    description:
      "Discord LFG + per-server Vibe Check / Ghostless reliability. Parties, vibes, fewer ghosts.",
    images: [{ url: "/brand/rallied-og-landscape.jpg", width: 1200, height: 675 }],
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
