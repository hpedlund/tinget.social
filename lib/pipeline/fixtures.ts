/**
 * Small hand-built pipeline input shared by the pipeline and data tests.
 *
 * Term 2022/23–2023/24, current riksmöte 2024/25. 13 term votes, so the
 * term threshold is 2 votes.
 * - 100001 (S): misses V5 only
 * - 100002 (M): misses V1 and V4
 * - 100003 (SD): substitute, votes only in V4
 * - 100004: V until V3/fillers, then "-" (politisk vilde) from V5; misses V3
 */
import type { Ballot, Members, RiksmoteVotes, Rost, Vote } from "@/lib/riksdagen/types";

import { definePeriods } from "./periods";

const PEOPLE: Record<string, { name: string; first: string; last: string; constituency: string }> = {
  "100001": { name: "Anna Andersson", first: "Anna", last: "Andersson", constituency: "Stockholms län" },
  "100002": { name: "Bo Berg", first: "Bo", last: "Berg", constituency: "Skåne läns västra" },
  "100003": { name: "Cecilia Carlsson", first: "Cecilia", last: "Carlsson", constituency: "Uppsala län" },
  "100004": { name: "David Dahl", first: "David", last: "Dahl", constituency: "Gotlands län" },
};

function vote(
  id: string,
  date: string,
  ballots: Array<[memberId: string, party: string, rost: Rost]>,
): Vote {
  return {
    id,
    riksmote: "",
    beteckning: `AU${id.replace(/\D/g, "")}`,
    punkt: 1,
    avser: "sakfrågan",
    date,
    ballots: ballots.map(
      ([memberId, party, rost]): Ballot => ({
        memberId,
        name: PEOPLE[memberId]!.name,
        party,
        constituency: PEOPLE[memberId]!.constituency,
        rost,
      }),
    ),
  };
}

function riksmote(rm: string, votes: Vote[]): RiksmoteVotes {
  return {
    schemaVersion: 1,
    riksmote: rm,
    source: "dataset",
    fetchedAt: "2026-10-20T00:00:00.000Z",
    votes: votes.map((v) => ({ ...v, riksmote: rm })),
  };
}

const fillers = Array.from({ length: 8 }, (_, i) =>
  vote(`F${i + 1}`, `2022-12-0${i + 1}`, [
    ["100001", "S", "Ja"],
    ["100002", "M", "Nej"],
    ["100004", "V", "Ja"],
  ]),
);

export const FIXTURE_VOTES: RiksmoteVotes[] = [
  riksmote("2022/23", [
    vote("V1", "2022-10-01", [["100001", "S", "Ja"], ["100002", "M", "Frånvarande"], ["100004", "V", "Nej"]]),
    vote("V2", "2022-11-01", [["100001", "S", "Nej"], ["100002", "M", "Ja"], ["100004", "V", "Avstår"]]),
    vote("V3", "2023-03-01", [["100001", "S", "Ja"], ["100002", "M", "Ja"], ["100004", "V", "Frånvarande"]]),
    ...fillers,
  ]),
  riksmote("2023/24", [
    vote("V4", "2023-10-01", [["100001", "S", "Ja"], ["100002", "M", "Frånvarande"], ["100003", "SD", "Ja"]]),
    vote("V5", "2024-02-01", [["100001", "S", "Frånvarande"], ["100002", "M", "Ja"], ["100004", "-", "Ja"]]),
  ]),
  riksmote("2024/25", [
    vote("V6", "2024-10-01", [["100001", "S", "Ja"], ["100002", "M", "Ja"], ["100004", "-", "Ja"]]),
  ]),
];

export const FIXTURE_MEMBERS: Members = {
  schemaVersion: 1,
  fetchedAt: "2026-10-20T00:00:00.000Z",
  members: Object.entries(PEOPLE).map(([id, p]) => ({
    id,
    firstName: p.first,
    lastName: p.last,
    sortName: `${p.last},${p.first}`,
    party: "",
    constituency: p.constituency,
    status: "Tjänstgörande riksdagsledamot",
    birthYear: 1970,
    gender: "kvinna",
    imageUrl: null,
    chamberAssignments: [],
  })),
};

export const FIXTURE_PERIODS = definePeriods(["2022/23", "2023/24"], "2024/25");

export const FIXTURE_INPUT = {
  votes: FIXTURE_VOTES,
  members: FIXTURE_MEMBERS,
  periods: FIXTURE_PERIODS,
  defaultPeriodId: "2022-2024",
};
