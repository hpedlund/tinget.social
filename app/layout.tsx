import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "tinget.social — Närvaro i riksdagen",
    template: "%s — tinget.social",
  },
  description:
    "Vilka riksdagsledamöter är på plats och röstar? En oberoende sammanställning baserad på riksdagens öppna data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#innehall"
          className="sr-only rounded-md bg-primary text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
        >
          Hoppa till innehållet
        </a>
        <SiteHeader />
        <main
          id="innehall"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
