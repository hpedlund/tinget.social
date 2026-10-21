/** Groups upcoming decisions by date relative to "today". Pure; safe in the browser. */
import type { AgendaItem } from "@/lib/data/types";

export interface AgendaDay {
  date: string;
  items: AgendaItem[];
}

export interface AgendaSchedule {
  /** Planned for today, or for an earlier day but not yet decided — oldest first */
  current: AgendaDay[];
  /** Planned after today — soonest first */
  upcoming: AgendaDay[];
  /** No decision date yet */
  unscheduled: AgendaItem[];
}

const stockholmDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date in Sweden, "YYYY-MM-DD" — the Riksdag's dates are Swedish dates. */
export function stockholmToday(now: Date): string {
  return stockholmDate.format(now);
}

export function groupAgenda(items: readonly AgendaItem[], today: string): AgendaSchedule {
  const days = new Map<string, AgendaItem[]>();
  const unscheduled: AgendaItem[] = [];
  for (const item of items) {
    if (item.decisionDate === null) {
      unscheduled.push(item);
      continue;
    }
    const day = days.get(item.decisionDate);
    if (day) day.push(item);
    else days.set(item.decisionDate, [item]);
  }
  const sorted = [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
  return {
    current: sorted.filter((day) => day.date <= today),
    upcoming: sorted.filter((day) => day.date > today),
    unscheduled,
  };
}

const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

/** "2026-10-21" → "onsdag" (no time zone involved) */
export function weekday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]!;
}
