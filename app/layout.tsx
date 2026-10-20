import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tinget.social — Närvaro i riksdagen",
  description:
    "Vilka riksdagsledamöter är på plats och röstar? En oberoende sammanställning baserad på riksdagens öppna data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
