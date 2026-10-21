import { describe, expect, it } from "vitest";

import type { AgendaItem } from "@/lib/data/types";

import { groupAgenda, stockholmToday, weekday } from "./schedule";

const item = (beteckning: string, decisionDate: string | null): AgendaItem => ({
  dokId: `HE01${beteckning}`,
  beteckning,
  title: beteckning,
  committee: "",
  decisionDate,
  debateDate: null,
  documents: [],
  motions: 0,
});

describe("groupAgenda", () => {
  const items = [
    item("A", "2026-10-20"),
    item("B", "2026-10-21"),
    item("C", "2026-10-21"),
    item("D", "2026-11-04"),
    item("E", null),
  ];

  it("splits into current (today and overdue), upcoming and unscheduled", () => {
    const { current, upcoming, unscheduled } = groupAgenda(items, "2026-10-21");
    expect(current.map((d) => [d.date, d.items.map((i) => i.beteckning)])).toEqual([
      ["2026-10-20", ["A"]],
      ["2026-10-21", ["B", "C"]],
    ]);
    expect(upcoming.map((d) => d.date)).toEqual(["2026-11-04"]);
    expect(unscheduled.map((i) => i.beteckning)).toEqual(["E"]);
  });

  it("moves days into current as time passes", () => {
    expect(groupAgenda(items, "2026-10-19").current).toEqual([]);
    expect(groupAgenda(items, "2026-11-04").upcoming).toEqual([]);
  });
});

describe("dates", () => {
  it("uses the Swedish calendar date", () => {
    expect(stockholmToday(new Date("2026-10-21T22:30:00Z"))).toBe("2026-10-22");
    expect(stockholmToday(new Date("2026-10-21T21:30:00Z"))).toBe("2026-10-21");
  });

  it("names the weekday", () => {
    expect(weekday("2026-10-21")).toBe("onsdag");
    expect(weekday("2026-12-13")).toBe("söndag");
  });
});
