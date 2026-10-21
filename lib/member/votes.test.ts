import { describe, expect, it } from "vitest";

import type { VoteList } from "@/lib/votes";

import { filterVoteRows, memberVoteRows } from "./votes";

const LIST: VoteList = {
  riksmote: "2025/26",
  votes: [
    ["A", "2025-10-01", "JuU41", 2, 0, "Sänkt straffbarhetsålder"],
    ["B", "2025-10-01", "JuU41", 2, 1, "Sänkt straffbarhetsålder"],
    ["C", "2025-11-05", "SkU3", 1, 0, null],
    ["D", "2025-12-01", "1021-1", 0, 0, null],
    ["E", "2026-01-10", "FiU9", 4, 0, "Skattesänkning"],
  ],
  titles: { JuU41: "Skärpta regler för unga lagöverträdare", SkU3: "Skatteregler", "1021-1": "Prövning av yrkande" },
};

describe("memberVoteRows", () => {
  it("joins ballots with the vote list, newest first, skipping votes outside service", () => {
    const rows = memberVoteRows(LIST, "JN-AF");
    expect(rows.map((r) => [r.id, r.rost])).toEqual([
      ["E", "Frånvarande"],
      ["D", "Avstår"],
      ["B", "Nej"],
      ["A", "Ja"],
    ]);
    expect(rows[3]).toEqual({
      id: "A",
      date: "2025-10-01",
      beteckning: "JuU41",
      punkt: 2,
      motivfragan: false,
      topic: "Sänkt straffbarhetsålder",
      title: "Skärpta regler för unga lagöverträdare",
      hasPage: true,
      code: "J",
      rost: "Ja",
    });
    expect(rows[2]!.motivfragan).toBe(true);
    // No point heading: the document title is the topic, shown once.
    expect(rows[1]).toMatchObject({ topic: "Prövning av yrkande", title: null, hasPage: true });
    // No document: the beteckning, and no link.
    expect(rows[0]).toMatchObject({ topic: "Skattesänkning", title: null, hasPage: false });
  });

  it("throws when the ballot string does not match the vote list", () => {
    expect(() => memberVoteRows(LIST, "JN")).toThrow(/2 ballots but 5 votes/);
  });
});

describe("filterVoteRows", () => {
  const rows = memberVoteRows(LIST, "JNJAF");

  it("filters by ballot", () => {
    expect(filterVoteRows(rows, { code: "F", query: "" }).map((r) => r.id)).toEqual(["E"]);
    expect(filterVoteRows(rows, { code: null, query: "" })).toHaveLength(5);
  });

  it("matches every word against topic, title and beteckning, ignoring case", () => {
    expect(filterVoteRows(rows, { code: null, query: "SKATT" }).map((r) => r.id)).toEqual(["E", "C"]);
    expect(filterVoteRows(rows, { code: null, query: "juu41 unga" }).map((r) => r.id)).toEqual(["B", "A"]);
    expect(filterVoteRows(rows, { code: "J", query: "juu41" }).map((r) => r.id)).toEqual(["A"]);
  });
});
