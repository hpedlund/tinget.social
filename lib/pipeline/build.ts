/**
 * Pure builder for the data contract: validated Riksdagen cache data in,
 * every file of data/ out (path → content). No I/O, deterministic: the same
 * input in any order gives byte-identical output.
 */
import type { z } from "zod";

import { computeAttendance } from "@/lib/attendance";
import type {
  AttendanceResult,
  AttendanceSummary,
  MemberAttendance,
  VoteRecord,
} from "@/lib/attendance";
import {
  DATA_SCHEMA_VERSION,
  DATA_SOURCE,
  documentsFileSchema,
  memberFileSchema,
  membersIndexFileSchema,
  metaFileSchema,
  partiesFileSchema,
  rankingFileSchema,
  votesFileSchema,
} from "@/lib/data/schemas";
import type {
  DocumentEntry,
  GeneratedSummary,
  MemberFile,
  PartyEntry,
  Period,
  VoteCounts,
} from "@/lib/data/types";
import { compare } from "@/lib/riksdagen/compare";
import { RIKSDAGEN_BASE_URL, riksmoteSlug } from "@/lib/riksdagen/config";
import { formatZodError } from "@/lib/riksdagen/errors";
import type {
  Member,
  Members,
  RiksmoteDocuments,
  RiksmoteVotes,
  Rost,
  Vote,
  VoteDocument,
} from "@/lib/riksdagen/types";

import type { PeriodDefinition } from "./periods";

export interface BuildInput {
  /** One entry per riksmöte; every riksmöte of every period must be present */
  votes: readonly RiksmoteVotes[];
  /** What the votes are about, one entry per riksmöte of `votes`. */
  documents: readonly RiksmoteDocuments[];
  /** From data/generated-summaries.json; used only where Riksdagen has no summary. */
  generatedSummaries: readonly GeneratedSummary[];
  members: Members;
  periods: readonly PeriodDefinition[];
  defaultPeriodId: string;
}

export interface DataFile {
  /** Relative to data/, forward slashes */
  path: string;
  /** Serialised, newline-terminated JSON */
  content: string;
}

const header = { schemaVersion: DATA_SCHEMA_VERSION, source: DATA_SOURCE } as const;

const maxDate = (dates: readonly string[]) =>
  dates.reduce<string | null>((max, date) => (max === null || date > max ? date : max), null);
const minDate = (dates: readonly string[]) =>
  dates.reduce<string | null>((min, date) => (min === null || date < min ? date : min), null);

function summary(s: AttendanceSummary): AttendanceSummary {
  return { counts: s.counts, eligible: s.eligible, present: s.present, attendance: s.attendance };
}

function attributes(member: MemberAttendance) {
  return {
    memberId: member.memberId,
    name: member.name,
    party: member.party,
    constituency: member.constituency,
  };
}

function toRecords(data: RiksmoteVotes): VoteRecord[] {
  return data.votes.flatMap((vote) =>
    vote.ballots.map((ballot) => ({
      voteId: vote.id,
      riksmote: data.riksmote,
      date: vote.date,
      memberId: ballot.memberId,
      name: ballot.name,
      party: ballot.party,
      constituency: ballot.constituency,
      choice: ballot.rost,
    })),
  );
}

function voteCounts(vote: Vote): VoteCounts {
  const counts: VoteCounts = { ja: 0, nej: 0, avstar: 0, franvarande: 0 };
  for (const { rost } of vote.ballots) {
    if (rost === "Ja") counts.ja += 1;
    else if (rost === "Nej") counts.nej += 1;
    else if (rost === "Avstår") counts.avstar += 1;
    else counts.franvarande += 1;
  }
  return counts;
}

const BALLOT_CODE: Record<Rost, string> = { Ja: "J", Nej: "N", Avstår: "A", Frånvarande: "F" };

/** Votes in the order of votes/{riksmote}.json (and of the ballot strings). */
function sortedVotes(data: RiksmoteVotes): Vote[] {
  return [...data.votes].sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id));
}

function documentEntry(
  riksmote: string,
  doc: VoteDocument,
  generated: ReadonlyMap<string, GeneratedSummary>,
): DocumentEntry {
  const fallback = generated.get(`${riksmote} ${doc.beteckning}`);
  const summary: DocumentEntry["summary"] =
    doc.summary.length > 0
      ? { source: "riksdagen", heading: doc.heading, blocks: doc.summary, model: null }
      : fallback && fallback.dokId === doc.dokId
        ? { source: "generated", heading: fallback.heading, blocks: fallback.blocks, model: fallback.model }
        : null;
  return { beteckning: doc.beteckning, kind: doc.kind, dokId: doc.dokId, title: doc.title, summary };
}

function median(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function partyEntries(result: AttendanceResult): PartyEntry[] {
  return result.parties.map((party) => {
    const attendances = result.ranked
      .filter((member) => member.party === party.party)
      .map((member) => member.attendance)
      .sort((a, b) => a - b);
    return {
      party: party.party,
      memberCount: party.memberCount,
      ...summary(party),
      rankedMembers: attendances.length,
      spread:
        attendances.length === 0
          ? null
          : { min: attendances[0]!, median: median(attendances), max: attendances.at(-1)! },
    };
  });
}

/** Parses with the contract schema and serialises; a failure is a pipeline bug. */
function file<T>(path: string, schema: z.ZodType<T>, value: T): DataFile {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Generated ${path} breaks the data contract:\n${formatZodError(result.error)}`);
  }
  return { path, content: `${JSON.stringify(result.data, null, 2)}\n` };
}

export function buildDataFiles(input: BuildInput): DataFile[] {
  const byRiksmote = new Map<string, RiksmoteVotes>();
  for (const data of input.votes) {
    if (byRiksmote.has(data.riksmote)) throw new Error(`Votes for ${data.riksmote} given twice`);
    byRiksmote.set(data.riksmote, data);
  }
  const riksmoten = [...byRiksmote.keys()].sort(compare);

  const recordsFor = (rms: readonly string[]) =>
    rms.flatMap((rm) => {
      const data = byRiksmote.get(rm);
      if (!data) throw new Error(`No votes for ${rm}`);
      return toRecords(data);
    });
  const datesFor = (rms: readonly string[]) =>
    rms.flatMap((rm) => byRiksmote.get(rm)?.votes.map((vote) => vote.date) ?? []);

  const people = new Map<string, Member>(input.members.members.map((m) => [m.id, m]));

  if (!input.periods.some((p) => p.id === input.defaultPeriodId)) {
    throw new Error(`Default period ${input.defaultPeriodId} is not defined`);
  }

  const files: DataFile[] = [];

  // Periods: ranking + parties
  const results = input.periods.map((period) => ({
    period,
    result: computeAttendance(recordsFor(period.riksmoten)),
  }));

  const periods: Period[] = results.map(({ period, result }) => {
    const dates = datesFor(period.riksmoten);
    return {
      id: period.id,
      label: period.label,
      kind: period.kind,
      riksmoten: [...period.riksmoten],
      complete: period.complete,
      totalVotes: result.totalVotes,
      minEligibleVotes: result.minEligibleVotes,
      firstVoteDate: minDate(dates),
      lastVoteDate: maxDate(dates),
    };
  });

  files.push(
    file("meta.json", metaFileSchema, {
      ...header,
      sourceUrl: RIKSDAGEN_BASE_URL,
      defaultPeriodId: input.defaultPeriodId,
      lastVoteDate: maxDate(datesFor(riksmoten)),
      periods,
    }),
  );

  for (const { period, result } of results) {
    files.push(
      file(`ranking/${period.id}.json`, rankingFileSchema, {
        ...header,
        periodId: period.id,
        totalVotes: result.totalVotes,
        minEligibleVotes: result.minEligibleVotes,
        ranked: result.ranked.map((m) => ({ rank: m.rank, ...attributes(m), ...summary(m) })),
        belowThreshold: result.belowThreshold.map((m) => ({ ...attributes(m), ...summary(m) })),
      }),
    );
  }

  files.push(
    file("parties.json", partiesFileSchema, {
      ...header,
      periods: results.map(({ period, result }) => ({
        periodId: period.id,
        parties: partyEntries(result),
      })),
    }),
  );

  // Members: everyone in the data, over all riksmöten
  const everything = computeAttendance(recordsFor(riksmoten), { minEligibleVotes: 0 });
  const all = [...everything.ranked, ...everything.belowThreshold].sort((a, b) =>
    compare(a.memberId, b.memberId),
  );

  const placements = results.map(({ period, result }) => ({
    periodId: period.id,
    byMember: new Map<string, { rank: number | null; member: MemberAttendance }>([
      ...result.ranked.map((m) => [m.memberId, { rank: m.rank, member: m }] as const),
      ...result.belowThreshold.map((m) => [m.memberId, { rank: null, member: m }] as const),
    ]),
  }));

  files.push(
    file("members.json", membersIndexFileSchema, {
      ...header,
      members: all.map((m) => ({
        id: m.memberId,
        name: m.name,
        party: m.party,
        constituency: m.constituency,
      })),
    }),
  );

  // Ballot strings: one character per vote, in vote file order.
  const ballotStrings = new Map<string, { riksmote: string; votes: string }[]>();
  for (const rm of riksmoten) {
    const votes = sortedVotes(byRiksmote.get(rm)!);
    const codes = new Map<string, string[]>();
    votes.forEach((vote, index) => {
      for (const ballot of vote.ballots) {
        let row = codes.get(ballot.memberId);
        if (!row) codes.set(ballot.memberId, (row = Array<string>(votes.length).fill("-")));
        row[index] = BALLOT_CODE[ballot.rost];
      }
    });
    for (const [memberId, row] of codes) {
      const list = ballotStrings.get(memberId) ?? [];
      list.push({ riksmote: rm, votes: row.join("") });
      ballotStrings.set(memberId, list);
    }
  }

  for (const member of all) {
    const person = people.get(member.memberId);
    if (!person) throw new Error(`Member ${member.memberId} votes but is missing from members`);
    const memberFile: MemberFile = {
      ...header,
      id: member.memberId,
      name: member.name,
      firstName: person.firstName,
      lastName: person.lastName,
      sortName: person.sortName,
      party: member.party,
      constituency: member.constituency,
      status: person.status,
      total: summary(member),
      byRiksmote: member.byRiksmote.map((r) => ({ riksmote: r.riksmote, ...summary(r) })),
      periods: placements.flatMap(({ periodId, byMember }) => {
        const placement = byMember.get(member.memberId);
        return placement
          ? [{ periodId, rank: placement.rank, ...summary(placement.member) }]
          : [];
      }),
      ballots: ballotStrings.get(member.memberId) ?? [],
    };
    files.push(file(`members/${member.memberId}.json`, memberFileSchema, memberFile));
  }

  // Vote index and documents per riksmöte
  const documentsByRiksmote = new Map<string, RiksmoteDocuments>();
  for (const docs of input.documents) {
    if (documentsByRiksmote.has(docs.riksmote)) throw new Error(`Documents for ${docs.riksmote} given twice`);
    documentsByRiksmote.set(docs.riksmote, docs);
  }
  const generated = new Map(input.generatedSummaries.map((g) => [`${g.riksmote} ${g.beteckning}`, g]));

  for (const rm of riksmoten) {
    const docs = documentsByRiksmote.get(rm);
    if (!docs) throw new Error(`No documents for ${rm}`);
    const byBeteckning = new Map(docs.documents.map((doc) => [doc.beteckning, doc]));
    const votes = sortedVotes(byRiksmote.get(rm)!);

    files.push(
      file(`votes/${riksmoteSlug(rm)}.json`, votesFileSchema, {
        ...header,
        riksmote: rm,
        votes: votes.map((vote) => ({
          id: vote.id,
          date: vote.date,
          beteckning: vote.beteckning,
          punkt: vote.punkt,
          avser: vote.avser,
          rubrik:
            byBeteckning.get(vote.beteckning)?.punkter.find((p) => p.punkt === vote.punkt)?.rubrik ?? null,
          counts: voteCounts(vote),
        })),
      }),
    );

    const voted = new Set(votes.map((vote) => vote.beteckning));
    files.push(
      file(`documents/${riksmoteSlug(rm)}.json`, documentsFileSchema, {
        ...header,
        riksmote: rm,
        documents: docs.documents
          .filter((doc) => voted.has(doc.beteckning))
          .sort((a, b) => compare(a.beteckning, b.beteckning))
          .map((doc) => documentEntry(rm, doc, generated)),
      }),
    );
  }

  return files.sort((a, b) => compare(a.path, b.path));
}
