import { describe, expect, it } from "vitest";

import { formatDate, formatNumber, formatPercent } from "./format";
import { partyName } from "./parties";

// Intl uses U+00A0 / U+202F between digits and units in sv-SE.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatPercent", () => {
  it("formats with one decimal and a Swedish comma", () => {
    expect(plain(formatPercent(0.92345))).toBe("92,3 %");
    expect(plain(formatPercent(0))).toBe("0,0 %");
    expect(plain(formatPercent(1))).toBe("100,0 %");
  });

  it("truncates instead of rounding", () => {
    expect(plain(formatPercent(0.99996))).toBe("99,9 %");
    expect(plain(formatPercent(0.12399))).toBe("12,3 %");
  });

  it("is not thrown off by float noise", () => {
    expect(plain(formatPercent(0.29))).toBe("29,0 %");
    expect(plain(formatPercent(12 / 13))).toBe("92,3 %");
  });
});

describe("formatNumber", () => {
  it("groups thousands with a space", () => {
    expect(plain(formatNumber(2610))).toBe("2 610");
    expect(formatNumber(57)).toBe("57");
  });
});

describe("formatDate", () => {
  it("writes the date in Swedish", () => {
    expect(formatDate("2026-10-15")).toBe("15 oktober 2026");
    expect(formatDate("2023-01-01")).toBe("1 januari 2023");
  });

  it("rejects invalid dates", () => {
    expect(() => formatDate("2026-13-01")).toThrow();
    expect(() => formatDate("nonsense")).toThrow();
  });
});

describe("partyName", () => {
  it("names known parties, including politiska vildar", () => {
    expect(partyName("SD")).toBe("Sverigedemokraterna");
    expect(partyName("-")).toBe("Politisk vilde");
  });

  it("falls back to the code", () => {
    expect(partyName("XY")).toBe("XY");
    expect(partyName("toString")).toBe("toString");
  });
});
