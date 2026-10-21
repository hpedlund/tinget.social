import type { Metadata } from "next";

import { AgendaList } from "@/components/agenda-list";
import { stockholmToday } from "@/lib/agenda/schedule";
import { getAgenda } from "@/lib/data";
import { RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Voteringar",
  description: "Aktuella och kommande beslut i riksdagens kammare, med länkar till betänkandena och förslagen de gäller.",
};

export default async function VotesPage() {
  const agenda = await getAgenda();

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Aktuella och kommande voteringar</h1>
        <p className="text-lg text-muted-foreground">
          Betänkanden som riksdagen planerar att fatta beslut om under riksmötet {agenda.riksmote}.
          Länkarna går till betänkandet och till de förslag det behandlar hos riksdagen.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Datumen är riksdagens planering och kan ändras. Ett betänkande kan innehålla flera
          beslutspunkter, och de punkter där ingen begär votering avgörs utan omröstning.
        </p>
        <p className="text-sm text-muted-foreground">
          Källa:{" "}
          <a
            href={RIKSDAGEN_OPEN_DATA_URL}
            className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sveriges riksdag
          </a>
          .
        </p>
      </header>

      <AgendaList items={agenda.items} buildDate={stockholmToday(new Date())} />
    </div>
  );
}
