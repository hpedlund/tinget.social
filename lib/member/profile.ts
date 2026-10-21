/**
 * The member page's view model. Pure: joins a member's precomputed figures
 * with the period rankings and party averages at build time; computes no
 * attendance itself.
 */
import type { MemberDetail, PartyEntry, Period, Ranking, VoteCounts } from "@/lib/data/types";

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

export interface MemberProfile {
  /** The default period if the member has it, else their latest period. */
  headline: MemberPeriodRow;
  /** Riksmöte periods, oldest first. */
  riksmoten: MemberPeriodRow[];
  /** Frånvarande over every riksmöte in the data. */
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

  return {
    headline,
    riksmoten: rows.filter((row) => row.kind === "riksmote"),
    missedCount: member.total.counts.franvarande,
  };
}
