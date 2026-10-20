/**
 * The party overview's view model. Pure: selects and joins the precomputed
 * figures in parties.json; nothing is calculated here.
 */
import type { PartyEntry, Period } from "@/lib/data/types";
import { PARTY_CODES, partyName } from "@/lib/parties";

const collator = new Intl.Collator("sv-SE");

/** Party code of members without a party (politiska vildar). */
export const INDEPENDENT = "-";

export interface PartyRow {
  party: string;
  name: string;
  /** Pooled: present / eligible over all the party's members in the period. */
  attendance: number;
  memberCount: number;
  rankedMembers: number;
  spread: PartyEntry["spread"];
  rankingHref: string;
}

export interface PartyTrendRow {
  party: string;
  name: string;
  /** Pooled attendance per riksmöte, as `riksmoten`; `null` = no members that riksmöte. */
  cells: (number | null)[];
}

export interface PartyOverview {
  period: Period;
  /** Best first, as in parties.json; without politiska vildar. */
  parties: PartyRow[];
  independents: PartyRow | null;
  /** Oldest first. */
  riksmoten: Period[];
  trend: PartyTrendRow[];
}

export interface OverviewSources {
  defaultPeriodId: string;
  periods: readonly Period[];
  parties: ReadonlyMap<string, readonly PartyEntry[]>;
}

/** The ranking filtered by party; the period only when it is not the default. */
export function rankingHref(party: string, periodId: string, defaultPeriodId: string): string {
  const params = new URLSearchParams();
  if (periodId !== defaultPeriodId) params.set("period", periodId);
  params.set("parti", party);
  return `/?${params.toString()}`;
}

export function buildPartyOverview({ defaultPeriodId, periods, parties }: OverviewSources): PartyOverview {
  const period = periods.find((p) => p.id === defaultPeriodId);
  if (!period) throw new Error(`Unknown default period: ${defaultPeriodId}`);
  const entries = partiesFor(period.id);

  const rows = entries.map(
    (entry): PartyRow => ({
      party: entry.party,
      name: partyName(entry.party),
      attendance: entry.attendance,
      memberCount: entry.memberCount,
      rankedMembers: entry.rankedMembers,
      spread: entry.spread,
      rankingHref: rankingHref(entry.party, period.id, defaultPeriodId),
    }),
  );

  const riksmoten = periods.filter((p) => p.kind === "riksmote");
  const byRiksmote = riksmoten.map((rm) => new Map(partiesFor(rm.id).map((e) => [e.party, e.attendance])));

  const headlineOrder = rows.map((row) => row.party);
  const others = new Set(byRiksmote.flatMap((m) => [...m.keys()]).filter((code) => !headlineOrder.includes(code)));
  const trendOrder = [
    ...headlineOrder,
    ...PARTY_CODES.filter((code) => others.has(code)),
    ...[...others].filter((code) => !PARTY_CODES.includes(code)).sort(collator.compare),
  ].filter((code) => code !== INDEPENDENT);

  return {
    period,
    parties: rows.filter((row) => row.party !== INDEPENDENT),
    independents: rows.find((row) => row.party === INDEPENDENT) ?? null,
    riksmoten,
    trend: trendOrder.map((code) => ({
      party: code,
      name: partyName(code),
      cells: byRiksmote.map((m) => m.get(code) ?? null),
    })),
  };

  function partiesFor(periodId: string): readonly PartyEntry[] {
    const entries = parties.get(periodId);
    if (!entries) throw new Error(`No party figures for period ${periodId}`);
    return entries;
  }
}
