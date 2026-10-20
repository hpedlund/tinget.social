"use client";

import { useMemo, useRef } from "react";

import { RankingFilters } from "@/components/ranking-filters";
import { RankingTable } from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format";
import {
  isFiltered,
  parseViewState,
  selectRows,
  toSearch,
  type ExplorerData,
  type ViewState,
} from "@/lib/ranking/explorer";
import { useSearchState } from "@/lib/use-search-state";

/**
 * The ranking with filters and sorting, state in the URL query. The HTML is
 * prerendered with the default view; a shared URL applies after hydration.
 */
export function RankingExplorer({ data }: { data: ExplorerData }) {
  const [search, pushSearch] = useSearchState();
  const periodRef = useRef<HTMLSelectElement>(null);

  const state = useMemo(() => parseViewState(search, data), [search, data]);
  const { period, ranked, belowThreshold, totalRanked, totalBelow } = useMemo(
    () => selectRows(data, state),
    [data, state],
  );
  const filtered = isFiltered(state, data);
  const subsetShown = state.party !== null || state.constituency !== null;

  const update = (next: ViewState) => pushSearch(toSearch(next, data));
  const clear = () => {
    update({ ...state, periodId: data.defaultPeriodId, party: null, constituency: null });
    periodRef.current?.focus();
  };

  let status = subsetShown
    ? `Visar ${formatNumber(ranked.length)} av ${formatNumber(totalRanked)} rankade ledamöter.`
    : `Visar alla ${formatNumber(totalRanked)} rankade ledamöter.`;
  if (subsetShown && belowThreshold.length > 0) {
    status += ` ${formatNumber(belowThreshold.length)} av ${formatNumber(totalBelow)} ledamöter med få voteringar visas separat.`;
  }

  const orderText = state.order === "narvaro" ? "högst närvaro först" : "lägst närvaro först";

  return (
    <>
      <section aria-labelledby="rankning" className="space-y-4">
        <div className="space-y-1">
          <h2 id="rankning" className="text-2xl font-semibold tracking-tight">
            Rankning {period.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatNumber(period.totalVotes)} voteringar
            {period.firstVoteDate && period.lastVoteDate && (
              <>
                {" "}
                från {formatDate(period.firstVoteDate)} till {formatDate(period.lastVoteDate)}
              </>
            )}
            .{!period.complete && " Riksmötet pågår."}
          </p>
        </div>

        <RankingFilters
          data={data}
          state={state}
          onChange={update}
          onClear={clear}
          periodRef={periodRef}
        />

        <p role="status" aria-atomic="true" className="text-sm font-medium">
          {status}
        </p>

        {ranked.length > 0 ? (
          <RankingTable
            rows={ranked}
            sortDirection={state.order === "narvaro" ? "descending" : "ascending"}
            caption={
              `${formatNumber(ranked.length)} riksdagsledamöter rankade efter närvaro i voteringar ${period.label}, ${orderText}. ` +
              "Voteringar är de voteringar ledamoten kunde delta i. Lika närvaro ger delad plats." +
              (subsetShown ? " Plats gäller hela riksdagen." : "")
            }
          />
        ) : (
          <div className="space-y-3 rounded-lg border p-6 text-center">
            <p>Inga rankade ledamöter matchar filtren för {period.label}.</p>
            <Button variant="outline" onClick={clear} disabled={!filtered}>
              Rensa filter
            </Button>
          </div>
        )}
      </section>

      {belowThreshold.length > 0 && (
        <section aria-labelledby="fa-voteringar" className="space-y-3">
          <h2 id="fa-voteringar" className="text-2xl font-semibold tracking-tight">
            Ledamöter med få voteringar
          </h2>
          <p className="max-w-2xl leading-7 text-muted-foreground">
            De här ledamöterna, till exempel ersättare, statsråd eller ledamöter
            som lämnat riksdagen, tjänstgjorde i kammaren under färre än{" "}
            {formatNumber(period.minEligibleVotes)} voteringar (en tiondel av
            perioden) och rankas därför inte. Närvaron räknas bara på de
            voteringar de själva kunde delta i.
          </p>
          <RankingTable
            rows={belowThreshold}
            caption={`${formatNumber(belowThreshold.length)} ledamöter med färre än ${formatNumber(period.minEligibleVotes)} voteringar ${period.label}, i bokstavsordning. Voteringar är de voteringar ledamoten kunde delta i.`}
          />
        </section>
      )}
    </>
  );
}
