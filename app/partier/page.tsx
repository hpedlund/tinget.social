import type { Metadata } from "next";
import Link from "next/link";

import { AttendanceCaveat } from "@/components/attendance-caveat";
import { PartyTable } from "@/components/party-table";
import { PartyTrendTable } from "@/components/party-trend-table";
import { formatNumber, formatPercent } from "@/lib/format";
import { loadPartyOverview } from "@/lib/party-overview/load";
import { RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { period } = await loadPartyOverview();
  return {
    title: "Partier",
    description: `Närvaro i riksdagens voteringar per parti ${period.label}: partiets samlade närvaro, median och spridning bland ledamöterna.`,
  };
}

const linkClassName =
  "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export default async function PartiesPage() {
  const { period, parties, independents, riksmoten, trend } = await loadPartyOverview();

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Partier</h1>
        <p className="text-lg text-muted-foreground">
          Hur ofta partiernas ledamöter röstar Ja, Nej eller Avstår i riksdagens voteringar.
        </p>
        <p className="text-sm text-muted-foreground">
          Källa:{" "}
          <a href={RIKSDAGEN_OPEN_DATA_URL} className={linkClassName}>
            Sveriges riksdag
          </a>
          .
        </p>
        <AttendanceCaveat />
      </header>

      <section aria-labelledby="narvaro" className="space-y-4">
        <h2 id="narvaro" className="text-2xl font-semibold tracking-tight">
          Närvaro {period.label}
          {!period.complete && " (pågår)"}
        </h2>
        <PartyTable
          rows={parties}
          caption="Närvaro: alla voteringar partiets ledamöter kunde delta i, räknade tillsammans. Median, lägst och högst gäller partiets rankade ledamöter. Välj ett parti för att se dess ledamöter i rankingen."
        />
        {independents && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Politiska vildar (ledamöter utan parti): {formatNumber(independents.memberCount)}{" "}
            {independents.memberCount === 1 ? "ledamot" : "ledamöter"},{" "}
            <span className="tabular-nums">{formatPercent(independents.attendance)}</span> närvaro.{" "}
            <Link href={independents.rankingHref} prefetch={false} className={linkClassName}>
              Visa politiska vildar i rankingen
            </Link>
          </p>
        )}
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Varje votering räknas till det parti ledamoten tillhörde vid voteringen, och ersättare
          ingår för de voteringar de tjänstgjorde. En ledamot som bytt parti kan därför finnas med
          i två partier. Median, lägst och högst utgår från ledamotens senaste parti under perioden.
        </p>
      </section>

      {riksmoten.length > 0 && (
        <section aria-labelledby="per-riksmote" className="space-y-3">
          <h2 id="per-riksmote" className="text-2xl font-semibold tracking-tight">
            Per riksmöte
          </h2>
          <PartyTrendTable
            riksmoten={riksmoten}
            rows={trend}
            caption="Partiernas närvaro per riksmöte, räknad på samma sätt som ovan."
          />
        </section>
      )}
    </div>
  );
}
