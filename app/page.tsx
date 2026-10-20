import type { Metadata } from "next";

import { AttendanceCaveat } from "@/components/attendance-caveat";
import { RankingTable } from "@/components/ranking-table";
import { getDefaultPeriod, getRanking } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const period = await getDefaultPeriod();
  return {
    description: `Hur ofta varje riksdagsledamot röstar i riksdagens voteringar ${period.label} — rankat från högst till lägst närvaro.`,
  };
}

export default async function Home() {
  const period = await getDefaultPeriod();
  const ranking = await getRanking(period.id);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Närvaro i riksdagen
        </h1>
        <p className="text-lg text-muted-foreground">
          Andel av riksdagens {formatNumber(ranking.totalVotes)} voteringar{" "}
          {period.label} där ledamoten röstade Ja, Nej eller Avstår.
        </p>
        <p className="text-sm text-muted-foreground">
          {period.firstVoteDate && period.lastVoteDate && (
            <>
              Voteringar från {formatDate(period.firstVoteDate)} till{" "}
              {formatDate(period.lastVoteDate)}.{" "}
            </>
          )}
          Källa:{" "}
          <a
            href={RIKSDAGEN_OPEN_DATA_URL}
            className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sveriges riksdag
          </a>
          .
        </p>
        <AttendanceCaveat />
      </header>

      <section aria-labelledby="rankning" className="space-y-3">
        <h2 id="rankning" className="text-2xl font-semibold tracking-tight">
          Rankning {period.label}
        </h2>
        <RankingTable
          rows={ranking.ranked}
          caption={`${formatNumber(ranking.ranked.length)} riksdagsledamöter rankade efter närvaro i voteringar ${period.label}. Voteringar är de voteringar ledamoten kunde delta i. Lika närvaro ger delad plats.`}
        />
      </section>

      {ranking.belowThreshold.length > 0 && (
        <section aria-labelledby="fa-voteringar" className="space-y-3">
          <h2 id="fa-voteringar" className="text-2xl font-semibold tracking-tight">
            Ledamöter med få voteringar
          </h2>
          <p className="max-w-2xl leading-7 text-muted-foreground">
            De här ledamöterna, till exempel ersättare, statsråd eller ledamöter
            som lämnat riksdagen, tjänstgjorde i kammaren under färre än{" "}
            {formatNumber(ranking.minEligibleVotes)} voteringar (en tiondel av
            perioden) och rankas därför inte. Närvaron räknas bara på de
            voteringar de själva kunde delta i.
          </p>
          <RankingTable
            rows={ranking.belowThreshold}
            caption={`${formatNumber(ranking.belowThreshold.length)} ledamöter med färre än ${formatNumber(ranking.minEligibleVotes)} voteringar ${period.label}, i bokstavsordning. Voteringar är de voteringar ledamoten kunde delta i.`}
          />
        </section>
      )}
    </div>
  );
}
