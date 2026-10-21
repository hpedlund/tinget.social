/**
 * zod schemas for the generated files in data/ — the data contract between
 * the pipeline (`npm run data:compute`, validates on write) and the site
 * (`lib/data/`, validates on read at build time). Documented in data/README.md.
 * Strict objects: an unknown key is contract drift and fails the build.
 */
import { z } from "zod";

import { AVSER_VALUES } from "@/lib/riksdagen/schemas";

export const DATA_SCHEMA_VERSION = 2;
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

/**
 * How a member voted, one character per vote of the riksmöte in the order of
 * `votes/{riksmote}.json`: J = Ja, N = Nej, A = Avstår, F = Frånvarande,
 * "-" = no ballot (not serving).
 */
export const BALLOT_CODES = { J: "Ja", N: "Nej", A: "Avstår", F: "Frånvarande" } as const;
export const ballotStringSchema = z.string().regex(/^[JNAF-]+$/);

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
  /** Only riksmöten where the member has at least one ballot, oldest first. */
  ballots: z.array(z.strictObject({ riksmote, votes: ballotStringSchema })),
});

export const voteEntrySchema = z.strictObject({
  id: z.string().min(1),
  date: isoDate,
  beteckning: z.string().min(1),
  punkt: count,
  avser: z.enum(AVSER_VALUES),
  /** Heading of the betänkande's proposal point; `null` for omröstningar. */
  rubrik: z.string().min(1).nullable(),
  counts: voteCountsSchema,
});

export const votesFileSchema = z.strictObject({
  ...header,
  riksmote,
  votes: z.array(voteEntrySchema),
});

export const textBlockSchema = z.strictObject({
  type: z.enum(["p", "li"]),
  text: z.string().min(1),
});

/** Who wrote a summary: Riksdagen ("Beslut i korthet") or a language model. */
export const summarySchema = z.strictObject({
  source: z.enum(["riksdagen", "generated"]),
  heading: z.string().min(1).nullable(),
  blocks: z.array(textBlockSchema).min(1),
  /** Model id, for generated summaries only. */
  model: z.string().min(1).nullable(),
});

/** Beteckningar are used in URLs and file lookups: letters (incl. å/ä/ö), digits, "-". */
export const beteckningSchema = z.string().regex(/^[\p{L}\d-]{1,32}$/u);

export const documentEntrySchema = z.strictObject({
  beteckning: beteckningSchema,
  kind: z.enum(["betankande", "omrostning"]),
  dokId: z.string().regex(/^[\p{L}\d-]{4,32}$/u),
  title: z.string().min(1),
  summary: summarySchema.nullable(),
});

export const documentsFileSchema = z.strictObject({
  ...header,
  riksmote,
  documents: z.array(documentEntrySchema),
});

/**
 * Summaries generated by `npm run data:summarize` for documents Riksdagen has
 * not summarised. Pipeline input, not output: committed, kept across runs and
 * only used while Riksdagen's own summary is missing.
 */
export const generatedSummariesFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  summaries: z.array(
    z.strictObject({
      riksmote,
      beteckning: beteckningSchema,
      dokId: z.string().min(1),
      model: z.string().min(1),
      generatedAt: isoDate,
      heading: z.string().min(1).nullable(),
      blocks: z.array(textBlockSchema).min(1),
    }),
  ),
});
