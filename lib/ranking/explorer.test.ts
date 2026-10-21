import { describe, expect, it } from "vitest";

import type { Period, RankedRow, Ranking, UnrankedRow } from "@/lib/data/types";

import {
  buildExplorerData,
  defaultViewState,
  isFiltered,
  parseViewState,
  selectRows,
  toSearch,
  type ExplorerData,
} from "./explorer";

function period(id: string, label: string, kind: Period["kind"] = "riksmote"): Period {
  return {
    id,
    label,
    kind,
    riksmoten: ["2022/23"],
    complete: true,
    totalVotes: 100,
    minEligibleVotes: 10,
    firstVoteDate: "2022-10-17",
    lastVoteDate: "2023-09-13",
  };
}

function row(
  memberId: string,
  name: string,
  party: string,
  constituency: string,
  attendance: number,
  eligible = 100,
): UnrankedRow {
  const present = Math.round(attendance * eligible);
  return {
    memberId,
    name,
    party,
    constituency,
    counts: { ja: present, nej: 0, avstar: 0, franvarande: eligible - present },
    eligible,
    present,
    attendance,
  };
}

const ranked = (rank: number, base: UnrankedRow): RankedRow => ({ rank, ...base });

function ranking(periodId: string, rankedRows: RankedRow[], below: UnrankedRow[] = []): Ranking {
  return {
    schemaVersion: 2,
    source: "Sveriges riksdag",
    periodId,
    totalVotes: 100,
    minEligibleVotes: 10,
    ranked: rankedRows,
    belowThreshold: below,
  };
}

const term = ranking(
  "2022-2026",
  [
    ranked(1, row("1", "Anna", "S", "Uppsala län", 1)),
    ranked(1, row("2", "Bo", "M", "Gotlands län", 1)),
    ranked(3, row("3", "Cecilia", "SD", "Uppsala län", 0.9)),
    ranked(4, row("4", "David", "S", "Örebro län", 0.8)),
    ranked(4, row("5", "Eva", "XY", "Ångermanland", 0.8)),
  ],
  [row("6", "Fia", "S", "Uppsala län", 0.5, 5)],
);
// Member 3 has left SD and moved constituency in the later riksmöte.
const riksmote = ranking("2023-24", [
  ranked(1, row("3", "Cecilia", "-", "Örebro län", 1)),
  ranked(2, row("1", "Anna", "S", "Uppsala län", 0.95)),
]);

const data: ExplorerData = buildExplorerData("2022-2026", [
  { period: period("2022-2026", "2022–2026", "term"), ranking: term },
  { period: period("2023-24", "2023/24"), ranking: riksmote },
]);

describe("buildExplorerData", () => {
  it("lists each member once", () => {
    expect(data.members.map((m) => m.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("orders known parties first, unknown codes last", () => {
    expect(data.parties).toEqual(["S", "M", "SD", "-", "XY"]);
  });

  it("sorts constituencies with Swedish collation", () => {
    expect(data.constituencies).toEqual(["Gotlands län", "Uppsala län", "Ångermanland", "Örebro län"]);
  });

  it("decodes back to the contract rows", () => {
    const { ranked: rows, belowThreshold } = selectRows(data, defaultViewState(data));
    expect(rows).toEqual(
      term.ranked.map((r) => ({
        memberId: r.memberId,
        name: r.name,
        party: r.party,
        constituency: r.constituency,
        rank: r.rank,
        attendance: r.attendance,
        eligible: r.eligible,
        absent: r.counts.franvarande,
      })),
    );
    expect(belowThreshold).toEqual([
      expect.objectContaining({ memberId: "6", rank: null, eligible: 5, absent: 2 }),
    ]);
  });

  it("keeps party and constituency per period", () => {
    const later = selectRows(data, { ...defaultViewState(data), periodId: "2023-24" });
    expect(later.ranked[0]).toMatchObject({ memberId: "3", party: "-", constituency: "Örebro län" });
  });
});

describe("parseViewState / toSearch", () => {
  it("uses defaults for an empty query", () => {
    expect(parseViewState("", data)).toEqual(defaultViewState(data));
    expect(toSearch(defaultViewState(data), data)).toBe("");
  });

  it("reads every valid parameter", () => {
    const state = parseViewState("?period=2023-24&parti=-&valkrets=%C3%96rebro+l%C3%A4n&ordning=franvaro", data);
    expect(state).toEqual({ periodId: "2023-24", party: "-", constituency: "Örebro län", order: "franvaro" });
  });

  it("ignores invalid values parameter by parameter", () => {
    expect(parseViewState("?period=1999-00&parti=SD&valkrets=Mars&ordning=x&foo=1", data)).toEqual({
      ...defaultViewState(data),
      party: "SD",
    });
    expect(parseViewState("?parti=toString&parti=S&valkrets=", data).party).toBeNull();
    expect(parseViewState("?parti=s", data).party).toBeNull();
  });

  it("round-trips and omits defaults", () => {
    const search = "?period=2023-24&parti=S&valkrets=Uppsala+l%C3%A4n&ordning=franvaro";
    expect(toSearch(parseViewState(search, data), data)).toBe(search);
    expect(toSearch(parseViewState("?ordning=franvaro&period=2022-2026", data), data)).toBe("?ordning=franvaro");
  });

  it("does not count the sort order as a filter", () => {
    expect(isFiltered(parseViewState("?ordning=franvaro", data), data)).toBe(false);
    expect(isFiltered(parseViewState("?parti=S", data), data)).toBe(true);
    expect(isFiltered(parseViewState("?period=2023-24", data), data)).toBe(true);
  });
});

describe("selectRows", () => {
  const view = (search: string) => selectRows(data, parseViewState(search, data));
  const ids = (rows: { memberId: string }[]) => rows.map((r) => r.memberId);

  it("filters by party", () => {
    const result = view("?parti=S");
    expect(ids(result.ranked)).toEqual(["1", "4"]);
    expect(ids(result.belowThreshold)).toEqual(["6"]);
    expect(result.totalRanked).toBe(5);
    expect(result.totalBelow).toBe(1);
  });

  it("filters by constituency", () => {
    expect(ids(view("?valkrets=Uppsala+l%C3%A4n").ranked)).toEqual(["1", "3"]);
  });

  it("combines filters", () => {
    const result = view("?parti=S&valkrets=Uppsala+l%C3%A4n");
    expect(ids(result.ranked)).toEqual(["1"]);
    expect(ids(result.belowThreshold)).toEqual(["6"]);
  });

  it("can match nothing", () => {
    const result = view("?parti=M&valkrets=Uppsala+l%C3%A4n");
    expect(result.ranked).toEqual([]);
    expect(result.belowThreshold).toEqual([]);
  });

  it("keeps overall ranks when filtered", () => {
    expect(view("?parti=S").ranked.map((r) => r.rank)).toEqual([1, 4]);
  });

  it("sorts most absent first with ties still alphabetical", () => {
    expect(ids(view("?ordning=franvaro").ranked)).toEqual(["4", "5", "3", "1", "2"]);
    expect(ids(view("?ordning=franvaro").belowThreshold)).toEqual(["6"]);
  });
});
