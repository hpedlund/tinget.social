import type { z } from "zod";

import type {
  agendaItemSchema,
  agendaSchema,
  ballotSchema,
  chamberAssignmentSchema,
  manifestSchema,
  memberSchema,
  membersSchema,
  riksmoteVotesSchema,
  treatedDocumentSchema,
  voteSchema,
} from "./normalized";
import type { ROST_VALUES } from "./schemas";

export type Rost = (typeof ROST_VALUES)[number];
export type Ballot = z.infer<typeof ballotSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type RiksmoteVotes = z.infer<typeof riksmoteVotesSchema>;
export type ChamberAssignment = z.infer<typeof chamberAssignmentSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Members = z.infer<typeof membersSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type TreatedDocument = z.infer<typeof treatedDocumentSchema>;
export type AgendaItem = z.infer<typeof agendaItemSchema>;
export type Agenda = z.infer<typeof agendaSchema>;
