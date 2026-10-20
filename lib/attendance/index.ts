import type {
  AttendanceOptions,
  AttendanceResult,
  AttendanceSummary,
  MemberAttendance,
  PartyAttendance,
  RankedMember,
  VoteCounts,
  VoteRecord,
} from "./types";

export type * from "./types";

/** Share of a period's votes a member must be eligible for to be ranked. */
export const DEFAULT_THRESHOLD_SHARE = 0.1;

const compareText = (a: string, b: string) => a.localeCompare(b, "sv");

function emptyCounts(): VoteCounts {
  return { ja: 0, nej: 0, avstar: 0, franvarande: 0 };
}

function addChoice(counts: VoteCounts, record: VoteRecord) {
  switch (record.choice) {
    case "Ja":
      counts.ja += 1;
      break;
    case "Nej":
      counts.nej += 1;
      break;
    case "Avstår":
      counts.avstar += 1;
      break;
    case "Frånvarande":
      counts.franvarande += 1;
      break;
    default: {
      const unexpected: never = record.choice;
      throw new Error(`Unknown vote choice: ${String(unexpected)}`);
    }
  }
}

function toSummary(counts: VoteCounts): AttendanceSummary {
  const present = counts.ja + counts.nej + counts.avstar;
  const eligible = present + counts.franvarande;
  return {
    counts,
    eligible,
    present,
    attendance: eligible === 0 ? 0 : present / eligible,
  };
}

/** Attendance over any set of vote records (one member, one party, …). */
export function summarize(records: readonly VoteRecord[]): AttendanceSummary {
  const counts = emptyCounts();
  for (const record of records) addChoice(counts, record);
  return toSummary(counts);
}

function groupBy<K>(records: readonly VoteRecord[], key: (r: VoteRecord) => K) {
  const groups = new Map<K, VoteRecord[]>();
  for (const record of records) {
    const k = key(record);
    const group = groups.get(k);
    if (group) group.push(record);
    else groups.set(k, [record]);
  }
  return groups;
}

function byDateThenVoteId(a: VoteRecord, b: VoteRecord) {
  return a.date === b.date ? compareText(a.voteId, b.voteId) : compareText(a.date, b.date);
}

function summarizeMember(memberId: string, records: VoteRecord[]): MemberAttendance {
  const chronological = [...records].sort(byDateThenVoteId);
  // Non-null: a member group always has at least one record.
  const latest = chronological[chronological.length - 1]!;

  const byRiksmote = [...groupBy(chronological, (r) => r.riksmote)]
    .sort(([a], [b]) => compareText(a, b))
    .map(([riksmote, group]) => ({ riksmote, ...summarize(group) }));

  return {
    memberId,
    name: latest.name,
    party: latest.party,
    constituency: latest.constituency,
    ...summarize(chronological),
    byRiksmote,
    missedVoteIds: chronological
      .filter((r) => r.choice === "Frånvarande")
      .map((r) => r.voteId),
  };
}

function compareByName(a: MemberAttendance, b: MemberAttendance) {
  return compareText(a.name, b.name) || compareText(a.memberId, b.memberId);
}

function rank(members: MemberAttendance[]): RankedMember[] {
  const sorted = [...members].sort(
    (a, b) => b.attendance - a.attendance || compareByName(a, b),
  );
  let previous: RankedMember | undefined;
  return sorted.map((member, index) => {
    const ranked: RankedMember = {
      ...member,
      rank:
        previous && previous.attendance === member.attendance
          ? previous.rank
          : index + 1,
    };
    previous = ranked;
    return ranked;
  });
}

function summarizeParties(records: readonly VoteRecord[]): PartyAttendance[] {
  return [...groupBy(records, (r) => r.party)]
    .map(([party, group]) => ({
      party,
      memberCount: new Set(group.map((r) => r.memberId)).size,
      ...summarize(group),
    }))
    .sort((a, b) => b.attendance - a.attendance || compareText(a.party, b.party));
}

function assertNoDuplicates(records: readonly VoteRecord[]) {
  const seen = new Set<string>();
  for (const { voteId, memberId } of records) {
    const key = `${voteId}\u0000${memberId}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate vote record for vote ${voteId}, member ${memberId}`);
    }
    seen.add(key);
  }
}

/**
 * Attendance per member, party and riksmöte as defined in PROJECT.md.
 * A member is eligible for exactly the votes they have a record for, so
 * partial-period members and substitutes are measured over their own service.
 */
export function computeAttendance(
  records: readonly VoteRecord[],
  options: AttendanceOptions = {},
): AttendanceResult {
  assertNoDuplicates(records);

  const excluded = new Set(options.excludeMemberIds ?? []);
  const included = records.filter((r) => !excluded.has(r.memberId));

  const totalVotes = new Set(included.map((r) => r.voteId)).size;
  const minEligibleVotes =
    options.minEligibleVotes ?? Math.ceil(totalVotes * DEFAULT_THRESHOLD_SHARE);

  const members = [...groupBy(included, (r) => r.memberId)].map(
    ([memberId, group]) => summarizeMember(memberId, group),
  );

  return {
    totalVotes,
    minEligibleVotes,
    ranked: rank(members.filter((m) => m.eligible >= minEligibleVotes)),
    belowThreshold: members
      .filter((m) => m.eligible < minEligibleVotes)
      .sort(compareByName),
    parties: summarizeParties(included),
  };
}
