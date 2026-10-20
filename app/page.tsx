import type { Metadata } from "next";

import { AttendanceCaveat } from "@/components/attendance-caveat";
import { RankingExplorer } from "@/components/ranking-explorer";
import { getDefaultPeriod, getPeriods, getRanking } from "@/lib/data";
import { buildExplorerData } from "@/lib/ranking/explorer";
import { RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const period = await getDefaultPeriod();
  return {
    description: `Hur ofta varje riksdagsledamot röstar i riksdagens voteringar ${period.label} — rankat från högst till lägst närvaro.`,
  };
}

export default async function Home() {
  const defaultPeriod = await getDefaultPeriod();
  const periods = await getPeriods();
  const rankings = await Promise.all(periods.map((period) => getRanking(period.id)));
  const data = buildExplorerData(
    defaultPeriod.id,
    periods.map((period, index) => ({ period, ranking: rankings[index]! })),
  );

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Närvaro i riksdagen
        </h1>
        <p className="text-lg text-muted-foreground">
          Andel av riksdagens voteringar där ledamoten röstade Ja, Nej eller
          Avstår.
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
        <AttendanceCaveat />
      </header>

      <RankingExplorer data={data} />
    </div>
  );
}
