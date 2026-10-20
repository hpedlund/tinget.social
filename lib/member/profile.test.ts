import { describe, expect, it } from "vitest";

import type { MemberDetail, MissedVote, PartyEntry, Period, Ranking, UnrankedRow } from "@/lib/data/types";

import { buildMemberProfile, compactMissedVotes, type ProfileSources } from "./profile";

function period(id: string, kind: Period["kind"] = "riksmote"): Period {
  return {
    id,
    label: id.replace("-", kind === "term" ? "–" : "/"),
    kind,
    riksmoten: ["2022/23"],
    complete: id !== "2026-27",
    totalVotes: 100,
    minEligibleVotes: 10,
    firstVoteDate: "2022-10-17",
    lastVoteDate: "2023-09-13",
  };
}

const PERIODS = [period("2022-2026", "term"), period("2022-23"), period("2023-24"), period("2026-27")];

function summary(attendance: number, eligible = 100) {
  const present = Math.round(attendance * eligible);
  return {
    counts: { ja: present, nej: 0, avstar: 0, franvarande: eligible - present },
    eligible,
    present,
    attendance,
  };
}

function row(memberId: string, party: string, attendance: number, eligible = 100): UnrankedRow {
  return { memberId, name: `Namn ${memberId}`, party, constituency: "Gotlands län", ...summary(attendance, eligible) };
}

function ranking(periodId: string, ranked: UnrankedRow[], below: UnrankedRow[] = []): Ranking {
  return {
    schemaVersion: 1,
    source: "Sveriges riksdag",
    periodId,
    totalVotes: 100,
    minEligibleVotes: 10,
    ranked: ranked.map((r, index) => ({ rank: index + 1, ...r })),
    belowThreshold: below,
  };
}

function party(code: string, attendance: number): PartyEntry {
  return { party: code, memberCount: 2, ...summary(attendance), rankedMembers: 2, spread: null };
}

function vote(id: string, riksmote: string, date: string): MissedVote {
  return {
    id,
    riksmote,
    date,
    beteckning: "JuU2",
    punkt: 1,
    avser: "sakfrågan",
    counts: { ja: 200, nej: 100, avstar: 0, franvarande: 49 },
  };
}

function member(
  periods: { periodId: string; rank: number | null; attendance: number; eligible?: number }[],
  missedVotes: MissedVote[] = [],
): MemberDetail {
  const s = summary(0.9);
  return {
    schemaVersion: 1,
    source: "Sveriges riksdag",
    id: "1",
    name: "Namn 1",
    firstName: "Namn",
    lastName: "1",
    sortName: "1,Namn",
    party: "S",
    constituency: "Gotlands län",
    status: "Tjänstgörande riksdagsledamot",
    total: s,
    byRiksmote: [],
    periods: periods.map((p) => ({ periodId: p.periodId, rank: p.rank, ...summary(p.attendance, p.eligible) })),
    missedVotes,
  };
}

function sources(overrides: Partial<ProfileSources> = {}): ProfileSources {
  return {
    defaultPeriodId: "2022-2026",
    periods: PERIODS,
    rankings: new Map([
      ["2022-2026", ranking("2022-2026", [row("2", "M", 0.95), row("1", "S", 0.9)])],
      ["2022-23", ranking("2022-23", [row("1", "-", 0.8), row("2", "M", 0.7)])],
      ["2023-24", ranking("2023-24", [row("2", "M", 0.9)], [row("1", "S", 0.5, 5)])],
      ["2026-27", ranking("2026-27", [row("1", "S", 1, 1), row("3", "V", 1, 1)])],
    ]),
    parties: new Map([
      ["2022-2026", [party("M", 0.95), party("S", 0.88)]],
      ["2022-23", [party("M", 0.7), party("-", 0.8)]],
      ["2023-24", [party("M", 0.9)]],
    ]),
    ...overrides,
  };
}

const FULL = [
  { periodId: "2022-2026", rank: 2, attendance: 0.9 },
  { periodId: "2023-24", rank: null, attendance: 0.5, eligible: 5 },
  { periodId: "2022-23", rank: 1, attendance: 0.8 },
];

describe("buildMemberProfile", () => {
  it("uses the default period as the headline, with rank context and party average", () => {
    const { headline } = buildMemberProfile(member(FULL), sources());
    expect(headline).toMatchObject({
      periodId: "2022-2026",
      kind: "term",
      rank: 2,
      rankedCount: 2,
      minEligibleVotes: 10,
      attendance: 0.9,
      eligible: 100,
      party: "S",
      partyAttendance: 0.88,
    });
  });

  it("falls back to the member's latest period", () => {
    const profile = buildMemberProfile(member([{ periodId: "2026-27", rank: 1, attendance: 1, eligible: 1 }]), sources());
    expect(profile.headline).toMatchObject({ periodId: "2026-27", complete: false, rank: 1, rankedCount: 2 });
  });

  it("lists riksmöten oldest first with the party of each period", () => {
    const { riksmoten } = buildMemberProfile(member(FULL), sources());
    expect(riksmoten.map((r) => [r.periodId, r.rank, r.party, r.partyAttendance])).toEqual([
      ["2022-23", 1, "-", null],
      ["2023-24", null, "S", null],
    ]);
  });

  it("groups missed votes by riksmöte, newest first, keeping date order", () => {
    const votes = [
      vote("a", "2022/23", "2022-10-17"),
      vote("b", "2022/23", "2023-01-10"),
      vote("c", "2023/24", "2023-10-25"),
      vote("d", "2023/24", "2023-11-01"),
    ];
    const profile = buildMemberProfile(member(FULL, votes), sources());
    expect(profile.missedCount).toBe(4);
    expect(profile.missed.map((g) => [g.riksmote, g.votes.map((v) => v.id)])).toEqual([
      ["2023/24", ["c", "d"]],
      ["2022/23", ["a", "b"]],
    ]);
  });

  it("has no groups without missed votes", () => {
    const profile = buildMemberProfile(member(FULL), sources());
    expect(profile.missed).toEqual([]);
    expect(profile.missedCount).toBe(0);
  });

  it("throws when the member is missing from a period's ranking", () => {
    const rankings = new Map(sources().rankings);
    rankings.set("2022-23", ranking("2022-23", [row("2", "M", 0.7)]));
    expect(() => buildMemberProfile(member(FULL), sources({ rankings }))).toThrow(/disagrees with ranking\/2022-23/);
  });

  it("throws when the figures differ from the ranking", () => {
    const wrongRank = FULL.map((p) => (p.periodId === "2022-2026" ? { ...p, rank: 1 } : p));
    expect(() => buildMemberProfile(member(wrongRank), sources())).toThrow(/2022-2026/);
    const wrongShare = FULL.map((p) => (p.periodId === "2022-23" ? { ...p, attendance: 0.81 } : p));
    expect(() => buildMemberProfile(member(wrongShare), sources())).toThrow(/2022-23/);
  });

  it("throws for an unknown period", () => {
    expect(() =>
      buildMemberProfile(member([{ periodId: "2018-19", rank: 1, attendance: 1 }]), sources()),
    ).toThrow(/2018-19/);
  });
});

describe("compactMissedVotes", () => {
  it("keeps group order and encodes each vote as a tuple", () => {
    const motiv = { ...vote("b", "2022/23", "2023-01-10"), punkt: 3, avser: "motivfrågan" as const };
    expect(compactMissedVotes([{ riksmote: "2022/23", votes: [vote("a", "2022/23", "2022-10-17"), motiv] }])).toEqual([
      {
        riksmote: "2022/23",
        votes: [
          ["a", "2022-10-17", "JuU2", 1, 0, 49],
          ["b", "2023-01-10", "JuU2", 3, 1, 49],
        ],
      },
    ]);
  });
});
