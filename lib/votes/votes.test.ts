import { describe, expect, it } from "vitest";

import { buildVoteList, documentPath, documentSlug, voteListPath } from ".";

describe("document URLs", () => {
  it("makes ASCII slugs from beteckningar", () => {
    expect(documentSlug("JuU41")).toBe("juu41");
    expect(documentSlug("FöU9")).toBe("fou9");
    expect(documentSlug("UFöU1")).toBe("ufou1");
    expect(documentSlug("1015-1")).toBe("1015-1");
  });

  it("builds page and vote-list paths", () => {
    expect(documentPath("2025/26", "JuU41")).toBe("/voteringar/2025-26/juu41/");
    expect(documentPath("2025/26", "JuU41", "8EA8F8A3-AD25")).toBe(
      "/voteringar/2025-26/juu41/#votering-8ea8f8a3-ad25",
    );
    expect(voteListPath("2025/26")).toBe("/data/voteringar/2025-26.json");
  });
});

describe("buildVoteList", () => {
  it("encodes votes as tuples and titles by beteckning", () => {
    const counts = { ja: 1, nej: 0, avstar: 0, franvarande: 0 };
    expect(
      buildVoteList(
        "2025/26",
        [
          { id: "A", date: "2025-10-01", beteckning: "JuU41", punkt: 2, avser: "sakfrågan", rubrik: "R", counts },
          { id: "B", date: "2025-10-01", beteckning: "JuU41", punkt: 2, avser: "motivfrågan", rubrik: "R", counts },
        ],
        [{ beteckning: "JuU41", kind: "betankande", dokId: "HD01JuU41", title: "T", summary: null }],
      ),
    ).toEqual({
      riksmote: "2025/26",
      votes: [
        ["A", "2025-10-01", "JuU41", 2, 0, "R"],
        ["B", "2025-10-01", "JuU41", 2, 1, "R"],
      ],
      titles: { JuU41: "T" },
    });
  });
});
