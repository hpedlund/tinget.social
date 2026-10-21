import { describe, expect, it } from "vitest";

import type { AgendaFile } from "@/lib/data/types";
import type { Agenda, AgendaItem } from "@/lib/riksdagen/types";

import { buildAgendaFile } from "./agenda";

function item(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    dokId: "HE01FiU1",
    riksmote: "2026/27",
    beteckning: "FiU1",
    title: "Statens budget",
    committee: "FiU",
    decisionDate: "2026-12-09",
    debateDate: null,
    treats: [],
    ...overrides,
  };
}

const agenda = (items: AgendaItem[]): Agenda => ({
  schemaVersion: 1,
  riksmote: "2026/27",
  fetchedAt: "2026-10-21T00:00:00.000Z",
  items,
});

const parse = (a: Agenda) => JSON.parse(buildAgendaFile(a).content) as AgendaFile;

describe("buildAgendaFile", () => {
  it("orders by decision date with unscheduled items last", () => {
    const file = parse(
      agenda([
        item({ dokId: "HE01KU10", beteckning: "KU10", decisionDate: null }),
        item({ dokId: "HE01SoU3", beteckning: "SoU3", decisionDate: "2026-11-25" }),
        item({ dokId: "HE01CU2", beteckning: "CU2", decisionDate: "2026-11-25" }),
        item({ dokId: "HE01JuU2", beteckning: "JuU2", decisionDate: "2026-10-21" }),
      ]),
    );
    expect(file.items.map((i) => i.beteckning)).toEqual(["JuU2", "CU2", "SoU3", "KU10"]);
    expect(file.source).toBe("Sveriges riksdag");
    expect(file.riksmote).toBe("2026/27");
  });

  it("lists propositions first, labels documents and counts motions", () => {
    const doc = (dokId: string, type: string, number: string, name = "") => ({
      dokId,
      type,
      riksmote: "2025/26",
      number,
      title: `Titel ${number}`,
      name,
    });
    const [only] = parse(
      agenda([
        item({
          treats: [
            doc("HD0410", "mot", "4196", "Motion"),
            doc("HD03X1", "frsrdg", "RS1"),
            doc("HD0310", "prop", "10", "Proposition"),
            doc("HD032", "prop", "2", "Proposition"),
            doc("HD0411", "mot", "4197", "Motion"),
          ],
        }),
      ]),
    ).items;
    expect(only!.documents).toEqual([
      { dokId: "HD032", label: "Proposition 2025/26:2", title: "Titel 2" },
      { dokId: "HD0310", label: "Proposition 2025/26:10", title: "Titel 10" },
      { dokId: "HD03X1", label: "Framställning/redogörelse 2025/26:RS1", title: "Titel RS1" },
    ]);
    expect(only!.motions).toBe(2);
  });

  it("is deterministic regardless of input order", () => {
    const items = [
      item({ dokId: "HE01A1", beteckning: "A1", decisionDate: "2026-11-04" }),
      item({ dokId: "HE01B1", beteckning: "B1", decisionDate: "2026-11-04" }),
    ];
    expect(buildAgendaFile(agenda(items)).content).toBe(
      buildAgendaFile(agenda([...items].reverse())).content,
    );
  });
});
