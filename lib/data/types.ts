import type { z } from "zod";

import type {
  memberFileSchema,
  memberIndexEntrySchema,
  membersIndexFileSchema,
  metaFileSchema,
  partiesFileSchema,
  partyEntrySchema,
  periodSchema,
  rankedRowSchema,
  rankingFileSchema,
  unrankedRowSchema,
  voteCountsSchema,
  voteEntrySchema,
  votesFileSchema,
} from "./schemas";

export type VoteCounts = z.infer<typeof voteCountsSchema>;
export type Period = z.infer<typeof periodSchema>;
export type Meta = z.infer<typeof metaFileSchema>;
export type RankedRow = z.infer<typeof rankedRowSchema>;
export type UnrankedRow = z.infer<typeof unrankedRowSchema>;
export type Ranking = z.infer<typeof rankingFileSchema>;
export type PartyEntry = z.infer<typeof partyEntrySchema>;
export type PartiesFile = z.infer<typeof partiesFileSchema>;
export type MemberIndexEntry = z.infer<typeof memberIndexEntrySchema>;
export type MembersIndexFile = z.infer<typeof membersIndexFileSchema>;
export type MemberFile = z.infer<typeof memberFileSchema>;
export type VoteEntry = z.infer<typeof voteEntrySchema>;
export type VotesFile = z.infer<typeof votesFileSchema>;

/** A missed vote joined with its details from data/votes/. */
export interface MissedVote extends VoteEntry {
  riksmote: string;
}

/** What `getMember` returns: the member file with missed votes resolved. */
export interface MemberDetail extends Omit<MemberFile, "missedVoteIds"> {
  missedVotes: MissedVote[];
}
