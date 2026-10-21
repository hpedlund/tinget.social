import { describe, expect, it } from "vitest";

import type {
  DocumentsFile,
  MemberFile,
  Meta,
  PartiesFile,
  Ranking,
  VotesFile,
} from "@/lib/data/types";

import { buildDataFiles, type BuildInput } from "./build";
import { FIXTURE_DOCUMENTS, FIXTURE_INPUT, FIXTURE_MEMBERS, FIXTURE_VOTES } from "./fixtures";
import { definePeriods } from "./periods";

function build(input: BuildInput = FIXTURE_INPUT) {
  const files = buildDataFiles(input);
  const read = <T>(path: string): T => {
    const file = files.find((f) => f.path === path);
    if (!file) throw new Error(`no ${path}`);
    return JSON.parse(file.content) as T;
  };
  return { files, read };
}

describe("definePeriods", () => {
  it("defines the term first, then each riksmöte including the current one", () => {
    const periods = definePeriods(["2022/23", "2023/24", "2024/25", "2025/26"], "2026/27");
    expect(periods.map((p) => [p.id, p.label, p.kind, p.complete])).toEqual([
      ["2022-2026", "2022–2026", "term", true],
      ["2022-23", "2022/23", "riksmote", true],
      ["2023-24", "2023/24", "riksmote", true],
      ["2024-25", "2024/25", "riksmote", true],
      ["2025-26", "2025/26", "riksmote", true],
      ["2026-27", "2026/27", "riksmote", false],
    ]);
  });

  it("marks the term incomplete while its last riksmöte is in progress", () => {
    const [term] = definePeriods(["2022/23", "2023/24"], "2023/24");
    expect(term!.complete).toBe(false);
  });
});

describe("buildDataFiles", () => {
  it("writes the expected files", () => {
    expect(build().files.map((f) => f.path)).toEqual([
      "documents/2022-23.json",
      "documents/2023-24.json",
      "documents/2024-25.json",
      "members.json",
      "members/100001.json",
      "members/100002.json",
      "members/100003.json",
      "members/100004.json",
      "meta.json",
      "parties.json",
      "ranking/2022-2024.json",
      "ranking/2022-23.json",
      "ranking/2023-24.json",
      "ranking/2024-25.json",
      "votes/2022-23.json",
      "votes/2023-24.json",
      "votes/2024-25.json",
    ]);
  });

  it("describes periods and freshness in meta.json", () => {
    const meta = build().read<Meta>("meta.json");
    expect(meta).toMatchObject({
      schemaVersion: 2,
      source: "Sveriges riksdag",
      sourceUrl: "https://data.riksdagen.se",
      defaultPeriodId: "2022-2024",
      lastVoteDate: "2024-10-01",
    });
    expect(meta.periods[0]).toEqual({
      id: "2022-2024",
      label: "2022–2024",
      kind: "term",
      riksmoten: ["2022/23", "2023/24"],
      complete: true,
      totalVotes: 13,
      minEligibleVotes: 2,
      firstVoteDate: "2022-10-01",
      lastVoteDate: "2024-02-01",
    });
    expect(meta.periods.at(-1)).toMatchObject({ id: "2024-25", complete: false, totalVotes: 1 });
    expect(meta).not.toHaveProperty("generatedAt");
  });

  it("ranks each period separately with its own threshold", () => {
    const { read } = build();
    const term = read<Ranking>("ranking/2022-2024.json");
    expect(term.ranked.map((r) => [r.rank, r.memberId, r.party])).toEqual([
      [1, "100001", "S"],
      [2, "100004", "-"],
      [3, "100002", "M"],
    ]);
    expect(term.ranked[0]).toEqual({
      rank: 1,
      memberId: "100001",
      name: "Anna Andersson",
      party: "S",
      constituency: "Stockholms län",
      counts: { ja: 11, nej: 1, avstar: 0, franvarande: 1 },
      eligible: 13,
      present: 12,
      attendance: 12 / 13,
    });
    expect(term.belowThreshold.map((r) => r.memberId)).toEqual(["100003"]);
    expect(term.belowThreshold[0]).not.toHaveProperty("rank");

    // Two votes in 2023/24: the threshold is 1 and the substitute is ranked.
    const rm = read<Ranking>("ranking/2023-24.json");
    expect(rm.minEligibleVotes).toBe(1);
    expect(rm.ranked.map((r) => r.memberId)).toEqual(["100003", "100004", "100001", "100002"]);
    expect(rm.ranked.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  });

  it("pools party attendance and gives the spread of ranked members", () => {
    const parties = build().read<PartiesFile>("parties.json");
    expect(parties.periods.map((p) => p.periodId)).toEqual([
      "2022-2024",
      "2022-23",
      "2023-24",
      "2024-25",
    ]);
    const term = parties.periods[0]!.parties;
    // V: David's 11 votes as V (one missed); he is ranked under "-", his latest party.
    expect(term.find((p) => p.party === "V")).toMatchObject({
      memberCount: 1,
      eligible: 11,
      present: 10,
      rankedMembers: 0,
      spread: null,
    });
    expect(term.find((p) => p.party === "-")).toMatchObject({
      eligible: 1,
      attendance: 1,
      rankedMembers: 1,
      spread: { min: 11 / 12, median: 11 / 12, max: 11 / 12 },
    });
    expect(term.find((p) => p.party === "SD")).toMatchObject({ rankedMembers: 0, spread: null });
  });

  it("writes a member file across all riksmöten, with per-period ranks", () => {
    const { read } = build();
    const david = read<MemberFile>("members/100004.json");
    expect(david).toMatchObject({
      id: "100004",
      name: "David Dahl",
      firstName: "David",
      lastName: "Dahl",
      sortName: "Dahl,David",
      party: "-",
      constituency: "Gotlands län",
      status: "Tjänstgörande riksdagsledamot",
      total: { eligible: 13, present: 12 },
    });
    // Vote order V1 V2 F1–F8 V3 | V4 V5 | V6; David has no ballot in V4.
    expect(david.ballots).toEqual([
      { riksmote: "2022/23", votes: "NAJJJJJJJJF" },
      { riksmote: "2023/24", votes: "-J" },
      { riksmote: "2024/25", votes: "J" },
    ]);
    expect(david.byRiksmote.map((r) => [r.riksmote, r.eligible])).toEqual([
      ["2022/23", 11],
      ["2023/24", 1],
      ["2024/25", 1],
    ]);
    expect(david.periods.map((p) => [p.periodId, p.rank, p.eligible])).toEqual([
      ["2022-2024", 2, 12],
      ["2022-23", 2, 11], // tied with Bo Berg
      ["2023-24", 1, 1],
      ["2024-25", 1, 1],
    ]);
    expect(david).not.toHaveProperty("birthYear");
    expect(david).not.toHaveProperty("gender");
    expect(david).not.toHaveProperty("imageUrl");

    const bo = read<MemberFile>("members/100002.json");
    expect(bo.ballots.map((b) => b.votes)).toEqual(["FJNNNNNNNNJ", "FJ", "J"]);

    const cecilia = read<MemberFile>("members/100003.json");
    expect(cecilia.ballots).toEqual([{ riksmote: "2023/24", votes: "J-" }]);
    expect(cecilia.periods.map((p) => [p.periodId, p.rank])).toEqual([
      ["2022-2024", null],
      ["2023-24", 1],
    ]);
  });

  it("writes a vote index per riksmöte with counts", () => {
    const votes = build().read<VotesFile>("votes/2022-23.json");
    expect(votes.riksmote).toBe("2022/23");
    expect(votes.votes.map((v) => v.id)).toEqual([
      "V1", "V2", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "V3",
    ]);
    expect(votes.votes[0]).toEqual({
      id: "V1",
      date: "2022-10-01",
      beteckning: "AU1",
      punkt: 1,
      avser: "sakfrågan",
      rubrik: "Förslag AU1",
      counts: { ja: 1, nej: 1, avstar: 0, franvarande: 1 },
    });
  });

  it("writes what the votes are about, with Riksdagen's summary or a generated one", () => {
    const docs = build().read<DocumentsFile>("documents/2022-23.json");
    expect(docs.documents.map((d) => d.beteckning)).toEqual([
      "AU1", "AU2", "AU3", "AU4", "AU5", "AU6", "AU7", "AU8",
    ]);
    expect(docs.documents[0]).toEqual({
      beteckning: "AU1",
      kind: "betankande",
      dokId: "HA01AU1",
      title: "Betänkande AU1",
      summary: {
        source: "riksdagen",
        heading: "Riksdagen sa ja (AU1)",
        blocks: [{ type: "p", text: "Riksdagen sa ja till förslaget." }],
        model: null,
      },
    });
    expect(docs.documents[1]!.summary).toBeNull();

    const generated = {
      riksmote: "2022/23",
      beteckning: "AU2",
      dokId: "HA01AU2",
      model: "claude-test",
      generatedAt: "2026-10-21",
      heading: null,
      blocks: [{ type: "p" as const, text: "Genererad." }],
    };
    const withGenerated = buildDataFiles({
      ...FIXTURE_INPUT,
      generatedSummaries: [generated, { ...generated, beteckning: "AU1" }, { ...generated, beteckning: "AU3" }],
    });
    const read = JSON.parse(withGenerated.find((f) => f.path === "documents/2022-23.json")!.content) as DocumentsFile;
    expect(read.documents[1]!.summary).toEqual({
      source: "generated",
      heading: null,
      blocks: [{ type: "p", text: "Genererad." }],
      model: "claude-test",
    });
    // Riksdagen's own summary wins; a generated one for another document (dokId) is ignored.
    expect(read.documents[0]!.summary?.source).toBe("riksdagen");
    expect(read.documents[2]!.summary).toBeNull();
  });

  it("leaves the topic out for votes without a document", () => {
    const documents = FIXTURE_DOCUMENTS.map((rm) => ({
      ...rm,
      documents: rm.documents.filter((d) => d.beteckning !== "AU1"),
    }));
    const files = buildDataFiles({ ...FIXTURE_INPUT, documents });
    const votes = JSON.parse(files.find((f) => f.path === "votes/2022-23.json")!.content) as VotesFile;
    expect(votes.votes[0]).toMatchObject({ id: "V1", rubrik: null });
  });

  it("is deterministic regardless of input order", () => {
    const first = buildDataFiles(FIXTURE_INPUT);
    expect(buildDataFiles(FIXTURE_INPUT)).toEqual(first);

    const shuffled: BuildInput = {
      ...FIXTURE_INPUT,
      votes: [...FIXTURE_VOTES].reverse().map((rm) => ({
        ...rm,
        votes: [...rm.votes].reverse().map((v) => ({ ...v, ballots: [...v.ballots].reverse() })),
      })),
      documents: [...FIXTURE_DOCUMENTS].reverse().map((rm) => ({ ...rm, documents: [...rm.documents].reverse() })),
      members: { ...FIXTURE_MEMBERS, members: [...FIXTURE_MEMBERS.members].reverse() },
    };
    expect(buildDataFiles(shuffled)).toEqual(first);
  });

  it("pretty-prints with a trailing newline", () => {
    const meta = build().files.find((f) => f.path === "meta.json")!;
    expect(meta.content.startsWith('{\n  "schemaVersion": 2,')).toBe(true);
    expect(meta.content.endsWith("}\n")).toBe(true);
  });

  it("rejects a voter missing from the member list", () => {
    const members = { ...FIXTURE_MEMBERS, members: FIXTURE_MEMBERS.members.slice(1) };
    expect(() => buildDataFiles({ ...FIXTURE_INPUT, members })).toThrow(/100001/);
  });

  it("rejects a riksmöte given twice or missing", () => {
    expect(() =>
      buildDataFiles({ ...FIXTURE_INPUT, votes: [...FIXTURE_VOTES, FIXTURE_VOTES[0]!] }),
    ).toThrow(/given twice/);
    expect(() => buildDataFiles({ ...FIXTURE_INPUT, votes: FIXTURE_VOTES.slice(1) })).toThrow(
      /No votes for 2022\/23/,
    );
  });

  it("rejects an unknown default period", () => {
    expect(() => buildDataFiles({ ...FIXTURE_INPUT, defaultPeriodId: "1999-2000" })).toThrow(
      /Default period/,
    );
  });
});
