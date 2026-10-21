import { describe, expect, it } from "vitest";

import type { VoteDocument } from "@/lib/riksdagen/types";

import { buildPrompt, toGeneratedSummary } from "./summarize";

const DOC: VoteDocument = {
  beteckning: "1015-1",
  kind: "omrostning",
  dokId: "HE191015-1",
  title: "Prövning av talmannens förslag till statsminister",
  heading: null,
  summary: [],
  punkter: [],
};

const COUNTS = { ja: 175, nej: 170, avstar: 0, franvarande: 4 };

describe("buildPrompt", () => {
  it("lists the document and its votes, and fences the source text", () => {
    const prompt = buildPrompt("2026/27", DOC, [{ date: "2026-10-15", punkt: 0, rubrik: null, counts: COUNTS }], null);
    expect(prompt).toContain("Omröstning i kammaren 2026/27:1015-1");
    expect(prompt).toContain("- 2026-10-15: Ja 175, Nej 170, Avstår 0, Frånvarande 4");
    expect(prompt).not.toContain("<dokument>");

    const bet = { ...DOC, kind: "betankande" as const, beteckning: "JuU41" };
    const withText = buildPrompt("2025/26", bet, [{ date: "2026-08-13", punkt: 2, rubrik: "Sänkt ålder", counts: COUNTS }], " Text ");
    expect(withText).toContain("Utskottets betänkande 2025/26:JuU41");
    expect(withText).toContain(", punkt 2 (Sänkt ålder): Ja 175");
    expect(withText).toContain("<dokument>\nText\n</dokument>");
  });
});

describe("toGeneratedSummary", () => {
  it("keeps paragraphs, then bullets, with whitespace collapsed", () => {
    expect(
      toGeneratedSummary(
        "2026/27",
        DOC,
        { insufficient: false, heading: " Riksdagen prövade  statsministerförslaget ", paragraphs: ["Ett\nstycke.", " "], bullets: ["Punkt."] },
        "claude-opus-5-5",
        "2026-10-21",
      ),
    ).toEqual({
      riksmote: "2026/27",
      beteckning: "1015-1",
      dokId: "HE191015-1",
      model: "claude-opus-5-5",
      generatedAt: "2026-10-21",
      heading: "Riksdagen prövade statsministerförslaget",
      blocks: [
        { type: "p", text: "Ett stycke." },
        { type: "li", text: "Punkt." },
      ],
    });
  });

  it("gives nothing when the model found the source insufficient or wrote nothing", () => {
    const empty = { heading: null, paragraphs: [], bullets: [] };
    expect(toGeneratedSummary("2026/27", DOC, { insufficient: true, ...empty, paragraphs: ["x"] }, "m", "2026-10-21")).toBeNull();
    expect(toGeneratedSummary("2026/27", DOC, { insufficient: false, ...empty }, "m", "2026-10-21")).toBeNull();
  });
});
