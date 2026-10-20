/**
 * The member page's view model. Pure: joins a member's precomputed figures
 * with the period rankings and party averages at build time; computes no
 * attendance itself.
 */
import type {
  MemberDetail,
  MissedVote,
  PartyEntry,
  Period,
  Ranking,
  VoteCounts,
} from "@/lib/data/types";

export interface MemberPeriodRow {
  periodId: string;
  label: string;
  kind: Period["kind"];
  complete: boolean;
  /** `null` below the period's vote threshold. */
  rank: number | null;
  rankedCount: number;
  minEligibleVotes: number;
  counts: VoteCounts;
  eligible: number;
  attendance: number;
  /** The member's party in this period, as in the period's ranking. */
  party: string;
  /** Pooled attendance of that party in the period; `null` for "-" or no entry. */
  partyAttendance: number | null;
}

export interface MissedVoteGroup {
  riksmote: string;
  /** In date order. */
  votes: MissedVote[];
}

export interface MemberProfile {
  /** The default period if the member has it, else their latest period. */
  headline: MemberPeriodRow;
  /** Riksmöte periods, oldest first. */
  riksmoten: MemberPeriodRow[];
  /** Newest riksmöte first; only riksmöten with missed votes. */
  missed: MissedVoteGroup[];
  missedCount: number;
}

export interface ProfileSources {
  defaultPeriodId: string;
  periods: readonly Period[];
  rankings: ReadonlyMap<string, Ranking>;
  parties: ReadonlyMap<string, readonly PartyEntry[]>;
}

/**
 * Throws when the member file and a period's ranking disagree, so the
 * member page can never show other figures than the ranking page.
 */
export function buildMemberProfile(member: MemberDetail, sources: ProfileSources): MemberProfile {
  const rows = member.periods.map((entry): MemberPeriodRow => {
    const period = sources.periods.find((p) => p.id === entry.periodId);
    const ranking = sources.rankings.get(entry.periodId);
    if (!period || !ranking) throw new Error(`No period or ranking ${entry.periodId} for member ${member.id}`);

    const row =
      ranking.ranked.find((r) => r.memberId === member.id) ??
      ranking.belowThreshold.find((r) => r.memberId === member.id);
    const rank = row && "rank" in row ? row.rank : null;
    if (
      !row ||
      rank !== entry.rank ||
      row.attendance !== entry.attendance ||
      row.eligible !== entry.eligible ||
      row.counts.franvarande !== entry.counts.franvarande
    ) {
      throw new Error(`Member ${member.id} disagrees with ranking/${entry.periodId}.json`);
    }

    const party = row.party;
    const partyEntry =
      party === "-" ? undefined : sources.parties.get(entry.periodId)?.find((p) => p.party === party);

    return {
      periodId: period.id,
      label: period.label,
      kind: period.kind,
      complete: period.complete,
      rank: entry.rank,
      rankedCount: ranking.ranked.length,
      minEligibleVotes: ranking.minEligibleVotes,
      counts: entry.counts,
      eligible: entry.eligible,
      attendance: entry.attendance,
      party,
      partyAttendance: partyEntry?.attendance ?? null,
    };
  });

  const periodOrder = (row: MemberPeriodRow) => sources.periods.findIndex((p) => p.id === row.periodId);
  rows.sort((a, b) => periodOrder(a) - periodOrder(b));

  const headline =
    rows.find((row) => row.periodId === sources.defaultPeriodId) ??
    rows.findLast((row) => row.kind === "riksmote") ??
    rows.at(-1);
  if (!headline) throw new Error(`Member ${member.id} has no periods`);

  const groups = new Map<string, MissedVote[]>();
  for (const vote of member.missedVotes) {
    const group = groups.get(vote.riksmote);
    if (group) group.push(vote);
    else groups.set(vote.riksmote, [vote]);
  }
  const missed = [...groups]
    .map(([riksmote, votes]) => ({ riksmote, votes }))
    .sort((a, b) => b.riksmote.localeCompare(a.riksmote));

  return {
    headline,
    riksmoten: rows.filter((row) => row.kind === "riksmote"),
    missed,
    missedCount: member.missedVotes.length,
  };
}

/** [vote id, date, beteckning, punkt, motivfrågan (1) or not (0), Frånvarande in the vote] */
export type CompactMissedVote = [string, string, string, number, 0 | 1, number];

export interface CompactMissedGroup {
  riksmote: string;
  votes: CompactMissedVote[];
}

/**
 * Tuples for the client list: as Client Component props the rows are
 * serialised once, instead of as a server-rendered element tree next to
 * the HTML (2 000+ rows for some members).
 */
export function compactMissedVotes(groups: readonly MissedVoteGroup[]): CompactMissedGroup[] {
  return groups.map(({ riksmote, votes }) => ({
    riksmote,
    votes: votes.map((v) => [
      v.id,
      v.date,
      v.beteckning,
      v.punkt,
      v.avser === "motivfrågan" ? 1 : 0,
      v.counts.franvarande,
    ]),
  }));
}
