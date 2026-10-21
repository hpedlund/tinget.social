/**
 * zod schemas for the generated files in data/ — the data contract between
 * the pipeline (`npm run data:compute`, validates on write) and the site
 * (`lib/data/`, validates on read at build time). Documented in data/README.md.
 * Strict objects: an unknown key is contract drift and fails the build.
 */
import { z } from "zod";

import { AVSER_VALUES, dokId } from "@/lib/riksdagen/schemas";

export const DATA_SCHEMA_VERSION = 1;
export const DATA_SOURCE = "Sveriges riksdag";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const riksmote = z.string().regex(/^\d{4}\/\d{2}$/);
const count = z.number().int().nonnegative();
const share = z.number().min(0).max(1);

/** Riksdagen intressent_id — also used in file names, so strictly numeric. */
export const memberIdSchema = z.string().regex(/^\d+$/);
/** "2022-2026" (term) or "2025-26" (riksmöte) — also used in file names. */
export const periodIdSchema = z.string().regex(/^\d{4}-(\d{4}|\d{2})$/);

const header = {
  schemaVersion: z.literal(DATA_SCHEMA_VERSION),
  source: z.literal(DATA_SOURCE),
};

export const voteCountsSchema = z.strictObject({
  ja: count,
  nej: count,
  avstar: count,
  franvarande: count,
});

const summary = {
  counts: voteCountsSchema,
  eligible: count,
  present: count,
  attendance: share,
};

export const periodSchema = z.strictObject({
  id: periodIdSchema,
  label: z.string().min(1),
  kind: z.enum(["term", "riksmote"]),
  riksmoten: z.array(riksmote).min(1),
  complete: z.boolean(),
  totalVotes: count,
  minEligibleVotes: count,
  firstVoteDate: isoDate.nullable(),
  lastVoteDate: isoDate.nullable(),
});

export const metaFileSchema = z.strictObject({
  ...header,
  sourceUrl: z.url(),
  defaultPeriodId: periodIdSchema,
  lastVoteDate: isoDate.nullable(),
  periods: z.array(periodSchema).min(1),
});

const memberAttributes = {
  memberId: memberIdSchema,
  name: z.string().min(1),
  party: z.string(),
  constituency: z.string(),
};

export const unrankedRowSchema = z.strictObject({ ...memberAttributes, ...summary });
export const rankedRowSchema = z.strictObject({
  rank: z.number().int().positive(),
  ...memberAttributes,
  ...summary,
});

export const rankingFileSchema = z.strictObject({
  ...header,
  periodId: periodIdSchema,
  totalVotes: count,
  minEligibleVotes: count,
  ranked: z.array(rankedRowSchema),
  belowThreshold: z.array(unrankedRowSchema),
});

export const partyEntrySchema = z.strictObject({
  party: z.string(),
  memberCount: count,
  ...summary,
  rankedMembers: count,
  spread: z.strictObject({ min: share, median: share, max: share }).nullable(),
});

export const partiesFileSchema = z.strictObject({
  ...header,
  periods: z.array(
    z.strictObject({ periodId: periodIdSchema, parties: z.array(partyEntrySchema) }),
  ),
});

export const memberIndexEntrySchema = z.strictObject({
  id: memberIdSchema,
  name: z.string().min(1),
  party: z.string(),
  constituency: z.string(),
});

export const membersIndexFileSchema = z.strictObject({
  ...header,
  members: z.array(memberIndexEntrySchema),
});

export const memberFileSchema = z.strictObject({
  ...header,
  id: memberIdSchema,
  name: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  sortName: z.string(),
  party: z.string(),
  constituency: z.string(),
  status: z.string(),
  total: z.strictObject(summary),
  byRiksmote: z.array(z.strictObject({ riksmote, ...summary })),
  periods: z.array(
    z.strictObject({
      periodId: periodIdSchema,
      rank: z.number().int().positive().nullable(),
      ...summary,
    }),
  ),
  missedVoteIds: z.array(z.string().min(1)),
});

export const voteEntrySchema = z.strictObject({
  id: z.string().min(1),
  date: isoDate,
  beteckning: z.string().min(1),
  punkt: count,
  avser: z.enum(AVSER_VALUES),
  counts: voteCountsSchema,
});

export const votesFileSchema = z.strictObject({
  ...header,
  riksmote,
  votes: z.array(voteEntrySchema),
});

export const agendaItemSchema = z.strictObject({
  dokId,
  beteckning: z.string().min(1),
  title: z.string().min(1),
  committee: z.string(),
  /** Planned decision (vote) date; `null` while not yet scheduled */
  decisionDate: isoDate.nullable(),
  debateDate: isoDate.nullable(),
  /** Treated documents other than motions, e.g. "Proposition 2025/26:271" */
  documents: z.array(z.strictObject({ dokId, label: z.string().min(1), title: z.string() })),
  motions: count,
});

export const agendaFileSchema = z.strictObject({
  ...header,
  riksmote,
  items: z.array(agendaItemSchema),
});
