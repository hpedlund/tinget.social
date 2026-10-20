/**
 * The ranking explorer's client payload and view state. Pure: the page builds
 * the payload at build time, the browser decodes it, filters and sorts.
 */
import type { Period, Ranking, UnrankedRow } from "@/lib/data/types";
import { PARTY_CODES } from "@/lib/parties";

/** [member index, rank (0 = below threshold), attendance, eligible, absent, party index, constituency index] */
export type CompactRow = [number, number, number, number, number, number, number];

export interface ExplorerPeriod {
  id: string;
  label: string;
  kind: Period["kind"];
  complete: boolean;
  totalVotes: number;
  minEligibleVotes: number;
  firstVoteDate: string | null;
  lastVoteDate: string | null;
  /** Ranked rows in rank order, then below-threshold rows, as in the data file. */
  rows: CompactRow[];
}

export interface ExplorerData {
  defaultPeriodId: string;
  members: { id: string; name: string }[];
  /** Party codes: known parties in PARTY_CODES order, unknown codes last. */
  parties: string[];
  /** Sorted with Swedish collation. */
  constituencies: string[];
  periods: ExplorerPeriod[];
}

/** A decoded row, as `RankingTable` shows it. */
export interface RankingRow {
  memberId: string;
  name: string;
  party: string;
  constituency: string;
  /** Overall rank in the period; `null` below the vote threshold. */
  rank: number | null;
  attendance: number;
  eligible: number;
  absent: number;
}

export type Order = "narvaro" | "franvaro";

export interface ViewState {
  periodId: string;
  party: string | null;
  constituency: string | null;
  order: Order;
}

const collator = new Intl.Collator("sv-SE");

/**
 * Compacts every period's ranking into one payload. Party and constituency
 * stay per row: members can change party or constituency between periods.
 */
export function buildExplorerData(
  defaultPeriodId: string,
  periods: readonly { period: Period; ranking: Ranking }[],
): ExplorerData {
  const allRows = periods.flatMap(({ ranking }) => [...ranking.ranked, ...ranking.belowThreshold]);

  const memberIndex = new Map<string, number>();
  const members: ExplorerData["members"] = [];
  for (const row of allRows) {
    if (!memberIndex.has(row.memberId)) {
      memberIndex.set(row.memberId, members.length);
      members.push({ id: row.memberId, name: row.name });
    }
  }

  const partySet = new Set(allRows.map((row) => row.party));
  const parties = [
    ...PARTY_CODES.filter((code) => partySet.has(code)),
    ...[...partySet].filter((code) => !PARTY_CODES.includes(code)).sort(collator.compare),
  ];
  const constituencies = [...new Set(allRows.map((row) => row.constituency))].sort(collator.compare);
  const partyIndex = new Map(parties.map((code, index) => [code, index]));
  const constituencyIndex = new Map(constituencies.map((name, index) => [name, index]));

  return {
    defaultPeriodId,
    members,
    parties,
    constituencies,
    periods: periods.map(({ period, ranking }) => ({
      id: period.id,
      label: period.label,
      kind: period.kind,
      complete: period.complete,
      totalVotes: ranking.totalVotes,
      minEligibleVotes: ranking.minEligibleVotes,
      firstVoteDate: period.firstVoteDate,
      lastVoteDate: period.lastVoteDate,
      rows: [
        ...ranking.ranked.map((row) => compact(row, row.rank)),
        ...ranking.belowThreshold.map((row) => compact(row, 0)),
      ],
    })),
  };

  function compact(row: UnrankedRow, rank: number): CompactRow {
    return [
      memberIndex.get(row.memberId)!,
      rank,
      row.attendance,
      row.eligible,
      row.counts.franvarande,
      partyIndex.get(row.party)!,
      constituencyIndex.get(row.constituency)!,
    ];
  }
}

export function defaultViewState(data: ExplorerData): ViewState {
  return { periodId: data.defaultPeriodId, party: null, constituency: null, order: "narvaro" };
}

/**
 * Reads the view from a query string. Untrusted input: each value is used
 * only if it exactly matches a known value, otherwise it falls back to the
 * default. Never throws.
 */
export function parseViewState(search: string, data: ExplorerData): ViewState {
  const params = new URLSearchParams(search);
  const pick = (key: string, allowed: readonly string[]): string | null => {
    const value = params.get(key);
    return value !== null && allowed.includes(value) ? value : null;
  };
  const defaults = defaultViewState(data);
  return {
    periodId: pick("period", data.periods.map((p) => p.id)) ?? defaults.periodId,
    party: pick("parti", data.parties),
    constituency: pick("valkrets", data.constituencies),
    order: pick("ordning", ["franvaro"]) === "franvaro" ? "franvaro" : "narvaro",
  };
}

/** `""` for the default view, otherwise `"?…"` with defaults omitted. */
export function toSearch(state: ViewState, data: ExplorerData): string {
  const params = new URLSearchParams();
  if (state.periodId !== data.defaultPeriodId) params.set("period", state.periodId);
  if (state.party !== null) params.set("parti", state.party);
  if (state.constituency !== null) params.set("valkrets", state.constituency);
  if (state.order !== "narvaro") params.set("ordning", state.order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function isFiltered(state: ViewState, data: ExplorerData): boolean {
  return state.periodId !== data.defaultPeriodId || state.party !== null || state.constituency !== null;
}

export interface Selection {
  period: ExplorerPeriod;
  ranked: RankingRow[];
  belowThreshold: RankingRow[];
  totalRanked: number;
  totalBelow: number;
}

/**
 * Filters by party and constituency. Ranks are always the overall rank in
 * the period. "franvaro" reverses the ranking with a stable sort, so tied
 * members stay alphabetical; below-threshold rows always stay alphabetical.
 */
export function selectRows(data: ExplorerData, state: ViewState): Selection {
  const period = data.periods.find((p) => p.id === state.periodId) ?? data.periods[0]!;
  const ranked: RankingRow[] = [];
  const belowThreshold: RankingRow[] = [];
  let totalRanked = 0;

  for (const [member, rank, attendance, eligible, absent, party, constituency] of period.rows) {
    if (rank > 0) totalRanked++;
    const row: RankingRow = {
      memberId: data.members[member]!.id,
      name: data.members[member]!.name,
      party: data.parties[party]!,
      constituency: data.constituencies[constituency]!,
      rank: rank > 0 ? rank : null,
      attendance,
      eligible,
      absent,
    };
    if (state.party !== null && row.party !== state.party) continue;
    if (state.constituency !== null && row.constituency !== state.constituency) continue;
    (row.rank === null ? belowThreshold : ranked).push(row);
  }

  if (state.order === "franvaro") ranked.sort((a, b) => b.rank! - a.rank!);

  return {
    period,
    ranked,
    belowThreshold,
    totalRanked,
    totalBelow: period.rows.length - totalRanked,
  };
}
