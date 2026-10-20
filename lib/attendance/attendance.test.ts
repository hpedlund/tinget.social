import { describe, expect, it } from "vitest";
import { computeAttendance, summarize, type VoteChoice, type VoteRecord } from "@/lib/attendance";

// Builds records for one member: one choice per vote, votes v1, v2, … on consecutive days.
function member(
  memberId: string,
  choices: VoteChoice[],
  overrides: Partial<VoteRecord> & { startVote?: number } = {},
): VoteRecord[] {
  const { startVote = 1, ...rest } = overrides;
  return choices.map((choice, i) => {
    const n = startVote + i;
    return {
      voteId: `v${String(n).padStart(3, "0")}`,
      riksmote: "2024/25",
      date: `2025-01-${String(n).padStart(2, "0")}`,
      memberId,
      name: `Person ${memberId}`,
      party: "S",
      constituency: "Stockholms kommun",
      choice,
      ...rest,
    };
  });
}

const J: VoteChoice = "Ja";
const N: VoteChoice = "Nej";
const A: VoteChoice = "Avstår";
const F: VoteChoice = "Frånvarande";

describe("summarize", () => {
  it("counts Ja, Nej and Avstår as present and Frånvarande as absent", () => {
    expect(summarize(member("a", [J, N, A, F]))).toEqual({
      counts: { ja: 1, nej: 1, avstar: 1, franvarande: 1 },
      eligible: 4,
      present: 3,
      attendance: 0.75,
    });
  });

  it("returns zero attendance for no records", () => {
    expect(summarize([]).attendance).toBe(0);
  });
});

describe("computeAttendance", () => {
  it("handles empty input", () => {
    expect(computeAttendance([])).toEqual({
      totalVotes: 0,
      minEligibleVotes: 0,
      ranked: [],
      belowThreshold: [],
      parties: [],
    });
  });

  it("measures a partial-period member only over their own votes", () => {
    const records = [
      ...member("full", [J, J, J, J, F, F, J, J, J, J]),
      // Joined at vote 6: present at all five of their votes
      ...member("late", [J, N, A, J, J], { startVote: 6 }),
    ];
    const { ranked, totalVotes } = computeAttendance(records);
    expect(totalVotes).toBe(10);
    const late = ranked.find((m) => m.memberId === "late");
    expect(late).toMatchObject({ eligible: 5, present: 5, attendance: 1, rank: 1 });
    expect(ranked.find((m) => m.memberId === "full")).toMatchObject({
      eligible: 10,
      attendance: 0.8,
      rank: 2,
    });
  });

  it("measures a substitute separately from the member they replace", () => {
    const records = [
      ...member("regular", [J, J, J, J, J]),
      ...member("substitute", [F, J, J, J, J], { startVote: 6 }),
    ];
    const { ranked } = computeAttendance(records);
    expect(ranked.map((m) => [m.memberId, m.attendance])).toEqual([
      ["regular", 1],
      ["substitute", 0.8],
    ]);
  });

  it("lists members below the default 10 % threshold separately", () => {
    const records = [
      ...member("a", Array<VoteChoice>(20).fill(J)),
      ...member("short", [J], { startVote: 20 }),
      ...member("enough", [J, J], { startVote: 19 }),
    ];
    const result = computeAttendance(records);
    expect(result.minEligibleVotes).toBe(2);
    expect(result.belowThreshold.map((m) => m.memberId)).toEqual(["short"]);
    expect(result.ranked.map((m) => m.memberId)).toContain("enough");
  });

  it("applies an explicit threshold", () => {
    const records = [...member("a", [J, J, J]), ...member("b", [J, J], { startVote: 2 })];
    const result = computeAttendance(records, { minEligibleVotes: 3 });
    expect(result.ranked.map((m) => m.memberId)).toEqual(["a"]);
    expect(result.belowThreshold.map((m) => m.memberId)).toEqual(["b"]);
  });

  it("keeps below-threshold members in party aggregates", () => {
    const records = [
      ...member("a", [J, J, J, J, J, J, J, J, J, J]),
      ...member("short", [F], { startVote: 10 }),
    ];
    const result = computeAttendance(records, { minEligibleVotes: 2 });
    expect(result.parties).toEqual([
      expect.objectContaining({ party: "S", memberCount: 2, eligible: 11, present: 10 }),
    ]);
  });

  it("removes excluded members from members and parties", () => {
    const records = [...member("a", [J, J]), ...member("speaker", [F, F], { party: "M" })];
    const result = computeAttendance(records, { excludeMemberIds: ["speaker"] });
    expect([...result.ranked, ...result.belowThreshold].map((m) => m.memberId)).toEqual(["a"]);
    expect(result.parties.map((p) => p.party)).toEqual(["S"]);
  });

  it("gives tied members the same rank and orders them by name", () => {
    const records = [
      ...member("1", [J, J], { name: "Östen Ek" }),
      ...member("2", [J, F], { name: "Bo Al" }),
      ...member("3", [J, J, F, F], { name: "Åsa Berg" }),
      ...member("4", [J, J], { name: "Anna Ek" }),
      ...member("5", [F, F], { name: "Cecilia Dahl" }),
    ];
    const { ranked } = computeAttendance(records, { minEligibleVotes: 0 });
    expect(ranked.map((m) => [m.rank, m.name])).toEqual([
      [1, "Anna Ek"],
      [1, "Östen Ek"],
      [3, "Bo Al"],
      [3, "Åsa Berg"], // Swedish collation: Å after B
      [5, "Cecilia Dahl"],
    ]);
  });

  it("pools party attendance over votes rather than averaging members", () => {
    const records = [
      ...member("long", Array<VoteChoice>(9).fill(J)),
      ...member("brief", [F], { startVote: 10 }),
    ];
    const [party] = computeAttendance(records).parties;
    // Naive mean of members would be (1 + 0) / 2 = 0.5
    expect(party?.attendance).toBeCloseTo(0.9);
  });

  it("counts each vote towards the party the member belonged to at the time", () => {
    const records = [
      ...member("switcher", [J, F], { party: "L" }),
      ...member("switcher", [J, J], { party: "M", startVote: 3 }),
    ];
    const result = computeAttendance(records);
    expect(result.parties.map((p) => [p.party, p.eligible, p.attendance])).toEqual([
      ["M", 2, 1],
      ["L", 2, 0.5],
    ]);
    expect(result.ranked[0]).toMatchObject({ party: "M", eligible: 4 });
  });

  it("takes name, party and constituency from the most recent vote", () => {
    const records = [
      ...member("a", [J], { startVote: 5, name: "Nytt Namn", constituency: "Uppsala län" }),
      ...member("a", [J], { startVote: 1, name: "Gammalt Namn" }),
    ];
    expect(computeAttendance(records).ranked[0]).toMatchObject({
      name: "Nytt Namn",
      constituency: "Uppsala län",
    });
  });

  it("breaks attendance down per riksmöte in order", () => {
    const records = [
      ...member("a", [J, F], { riksmote: "2023/24" }),
      ...member("a", [J, J, J], { riksmote: "2024/25", startVote: 3 }),
    ];
    const [result] = computeAttendance(records).ranked;
    expect(result?.byRiksmote.map((r) => [r.riksmote, r.eligible, r.attendance])).toEqual([
      ["2023/24", 2, 0.5],
      ["2024/25", 3, 1],
    ]);
  });

  it("lists missed votes in date order", () => {
    const records = [...member("a", [F, J, F, J])].reverse();
    expect(computeAttendance(records).ranked[0]?.missedVoteIds).toEqual(["v001", "v003"]);
  });

  it("rejects duplicate records for the same vote and member", () => {
    const [record] = member("a", [J]);
    expect(() => computeAttendance([record!, { ...record!, choice: "Nej" }])).toThrow(
      /Duplicate vote record/,
    );
  });

  it("does not mutate its input", () => {
    const records = Object.freeze([...member("a", [F, J]), ...member("b", [J])]);
    expect(() => computeAttendance(records)).not.toThrow();
  });
});
