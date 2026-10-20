import { describe, expect, it } from "vitest";

import type { PartyEntry, Period } from "@/lib/data/types";

import { buildPartyOverview, rankingHref, type OverviewSources } from "./overview";

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

const PERIODS = [period("2022-2026", "term"), period("2022-23"), period("2023-24")];

function party(code: string, attendance: number): PartyEntry {
  const present = Math.round(attendance * 100);
  return {
    party: code,
    memberCount: 3,
    counts: { ja: present, nej: 0, avstar: 0, franvarande: 100 - present },
    eligible: 100,
    present,
    attendance,
    rankedMembers: 2,
    spread: { min: 0.5, median: attendance, max: 1 },
  };
}

function sources(overrides: Partial<OverviewSources> = {}): OverviewSources {
  return {
    defaultPeriodId: "2022-2026",
    periods: PERIODS,
    parties: new Map([
      ["2022-2026", [party("M", 0.9), party("-", 0.85), party("S", 0.8)]],
      ["2022-23", [party("S", 0.82), party("M", 0.81)]],
      ["2023-24", [party("M", 0.95), party("XY", 0.9), party("-", 0.7), party("KD", 0.6)]],
    ]),
    ...overrides,
  };
}

describe("buildPartyOverview", () => {
  it("lists the default period's parties best first, without politiska vildar", () => {
    const overview = buildPartyOverview(sources());
    expect(overview.period.id).toBe("2022-2026");
    expect(overview.parties.map((p) => p.party)).toEqual(["M", "S"]);
    expect(overview.parties[0]).toEqual({
      party: "M",
      name: "Moderaterna",
      attendance: 0.9,
      memberCount: 3,
      rankedMembers: 2,
      spread: { min: 0.5, median: 0.9, max: 1 },
      rankingHref: "/?parti=M",
    });
  });

  it("keeps politiska vildar separate", () => {
    expect(buildPartyOverview(sources()).independents).toMatchObject({ party: "-", attendance: 0.85, rankingHref: "/?parti=-" });
    const none = sources({ parties: new Map([...sources().parties, ["2022-2026", [party("S", 0.8)]]]) });
    expect(buildPartyOverview(none).independents).toBeNull();
  });

  it("shows each party per riksmöte, oldest first, with null where it had no members", () => {
    const overview = buildPartyOverview(sources());
    expect(overview.riksmoten.map((p) => p.id)).toEqual(["2022-23", "2023-24"]);
    expect(overview.trend).toEqual([
      { party: "M", name: "Moderaterna", cells: [0.81, 0.95] },
      { party: "S", name: "Socialdemokraterna", cells: [0.82, null] },
      { party: "KD", name: "Kristdemokraterna", cells: [null, 0.6] },
      { party: "XY", name: "XY", cells: [null, 0.9] },
    ]);
  });

  it("throws when a period has no party figures", () => {
    const parties = new Map(sources().parties);
    parties.delete("2023-24");
    expect(() => buildPartyOverview(sources({ parties }))).toThrow(/2023-24/);
    expect(() => buildPartyOverview(sources({ defaultPeriodId: "1999-00" }))).toThrow(/1999-00/);
  });
});

describe("rankingHref", () => {
  it("omits the default period and encodes the party", () => {
    expect(rankingHref("S", "2022-2026", "2022-2026")).toBe("/?parti=S");
    expect(rankingHref("-", "2023-24", "2022-2026")).toBe("/?period=2023-24&parti=-");
    expect(rankingHref("A&B", "2022-2026", "2022-2026")).toBe("/?parti=A%26B");
  });
});
