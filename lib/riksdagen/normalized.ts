/**
 * zod schemas for the normalised cache files written by `npm run data:fetch`
 * and read by later pipeline steps (attendance, data contract).
 */
import { z } from "zod";

import { AVSER_VALUES, ROST_VALUES } from "./schemas";

export const NORMALIZED_SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ballotSchema = z.object({
  memberId: z.string().min(1),
  name: z.string().min(1),
  party: z.string(),
  constituency: z.string(),
  rost: z.enum(ROST_VALUES),
});

export const voteSchema = z.object({
  id: z.string().min(1),
  riksmote: z.string(),
  beteckning: z.string().min(1),
  punkt: z.number().int().nonnegative(),
  avser: z.enum(AVSER_VALUES),
  date: isoDate,
  ballots: z.array(ballotSchema).min(1),
});

export const riksmoteVotesSchema = z.object({
  schemaVersion: z.literal(NORMALIZED_SCHEMA_VERSION),
  riksmote: z.string(),
  source: z.enum(["dataset", "api"]),
  fetchedAt: z.string(),
  votes: z.array(voteSchema),
});

export const chamberAssignmentSchema = z.object({
  role: z.string(),
  status: z.string(),
  from: isoDate,
  to: isoDate.nullable(),
});

export const memberSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  sortName: z.string(),
  party: z.string(),
  constituency: z.string(),
  status: z.string(),
  birthYear: z.number().int().nullable(),
  gender: z.string(),
  imageUrl: z.string().nullable(),
  chamberAssignments: z.array(chamberAssignmentSchema),
});

export const membersSchema = z.object({
  schemaVersion: z.literal(NORMALIZED_SCHEMA_VERSION),
  fetchedAt: z.string(),
  members: z.array(memberSchema),
});

export const manifestSchema = z.object({
  riksmoten: z.record(
    z.string(),
    z.object({
      source: z.enum(["dataset", "api"]),
      complete: z.boolean(),
      fetchedAt: z.string(),
      votes: z.number().int(),
      ballots: z.number().int(),
    }),
  ),
});
