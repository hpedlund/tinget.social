import type { z } from "zod";

import type {
  documentEntrySchema,
  documentsFileSchema,
  generatedSummariesFileSchema,
  memberFileSchema,
  memberIndexEntrySchema,
  membersIndexFileSchema,
  metaFileSchema,
  partiesFileSchema,
  partyEntrySchema,
  periodSchema,
  rankedRowSchema,
  rankingFileSchema,
  summarySchema,
  textBlockSchema,
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

export type TextBlock = z.infer<typeof textBlockSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type DocumentEntry = z.infer<typeof documentEntrySchema>;
export type DocumentsFile = z.infer<typeof documentsFileSchema>;
export type GeneratedSummariesFile = z.infer<typeof generatedSummariesFileSchema>;
export type GeneratedSummary = GeneratedSummariesFile["summaries"][number];

/** What `getMember` returns: the member file, checked against data/votes/. */
export type MemberDetail = MemberFile;
