export type VoteChoice = "Ja" | "Nej" | "Avstår" | "Frånvarande";

/** One member's recorded choice in one vote (votering), normalised from Riksdagen data. */
export interface VoteRecord {
  /** Riksdagen votering_id */
  voteId: string;
  /** Parliamentary year, e.g. "2024/25" */
  riksmote: string;
  /** ISO date of the vote, "YYYY-MM-DD" */
  date: string;
  /** Riksdagen intressent_id */
  memberId: string;
  /** Display name at the time of the vote */
  name: string;
  /** Party code at the time of the vote */
  party: string;
  /** Constituency (valkrets) at the time of the vote */
  constituency: string;
  choice: VoteChoice;
}

export interface VoteCounts {
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
}

export interface AttendanceSummary {
  counts: VoteCounts;
  /** Votes the member could have taken part in (all four choices) */
  eligible: number;
  /** Ja + Nej + Avstår */
  present: number;
  /** present / eligible in 0..1, unrounded; 0 when eligible is 0 */
  attendance: number;
}

export interface RiksmoteAttendance extends AttendanceSummary {
  riksmote: string;
}

export interface MemberAttendance extends AttendanceSummary {
  memberId: string;
  /** From the member's most recent vote */
  name: string;
  /** From the member's most recent vote */
  party: string;
  /** From the member's most recent vote */
  constituency: string;
  /** Sorted by riksmöte ascending */
  byRiksmote: RiksmoteAttendance[];
  /** Votes recorded as Frånvarande, in date order */
  missedVoteIds: string[];
}

export interface RankedMember extends MemberAttendance {
  /** 1 = highest attendance; ties share a rank (1, 2, 2, 4) */
  rank: number;
}

export interface PartyAttendance extends AttendanceSummary {
  party: string;
  /** Members with at least one vote for this party, including those below the threshold */
  memberCount: number;
}

export interface AttendanceOptions {
  /** Default: ceil(10 % of the distinct votes in the input) */
  minEligibleVotes?: number;
  /** Removed before any calculation, e.g. the Speaker */
  excludeMemberIds?: readonly string[];
}

export interface AttendanceResult {
  /** Distinct votes in the input (after exclusions) */
  totalVotes: number;
  /** Threshold actually applied */
  minEligibleVotes: number;
  /** Members at or above the threshold, best attendance first */
  ranked: RankedMember[];
  /** Members below the threshold, sorted by name */
  belowThreshold: MemberAttendance[];
  /** Pooled per party, best attendance first */
  parties: PartyAttendance[];
}
