# Spec: TASK-004 — Attendance calculation

## Summary

Implement the attendance metric from PROJECT.md as pure, unit-tested TypeScript functions in `lib/attendance/`. Input is a normalised list of vote records; output is per-member attendance (ranked), members below the eligibility threshold, per-party aggregates and per-riksmöte breakdowns. This task does not fetch or parse Riksdagen data: TASK-003 maps Riksdagen vote rows into the `VoteRecord` type defined here.

## Data Model

```ts
type VoteChoice = "Ja" | "Nej" | "Avstår" | "Frånvarande";

interface VoteRecord {
  voteId: string;       // Riksdagen votering_id
  riksmote: string;     // e.g. "2024/25"
  date: string;         // ISO date of the vote, "YYYY-MM-DD"
  memberId: string;     // Riksdagen intressent_id
  name: string;         // display name at the time of the vote
  party: string;        // party code at the time of the vote
  constituency: string; // valkrets at the time of the vote
  choice: VoteChoice;
}

interface VoteCounts { ja: number; nej: number; avstar: number; franvarande: number }

interface AttendanceSummary {
  counts: VoteCounts;
  eligible: number;     // all four counts
  present: number;      // ja + nej + avstar
  attendance: number;   // present / eligible, 0..1 (not rounded); 0 when eligible = 0
}

interface MemberAttendance extends AttendanceSummary {
  memberId: string;
  name: string;         // from the member's most recent vote in the input
  party: string;        // "
  constituency: string; // "
  byRiksmote: Array<{ riksmote: string } & AttendanceSummary>; // sorted ascending
  missedVoteIds: string[];  // votes recorded as Frånvarande, in date order
}

interface RankedMember extends MemberAttendance { rank: number }

interface PartyAttendance extends AttendanceSummary {
  party: string;
  memberCount: number;  // members (incl. below threshold) with ≥ 1 vote for the party
}

interface AttendanceResult {
  totalVotes: number;          // distinct voteIds in the input
  minEligibleVotes: number;    // threshold actually applied
  ranked: RankedMember[];      // eligible ≥ threshold, rank 1 = highest attendance
  belowThreshold: MemberAttendance[]; // sorted by name
  parties: PartyAttendance[];  // sorted by attendance desc, then party code
}
```

## Rules

1. **Eligibility comes from the data.** A member is eligible for a vote if, and only if, the input contains a record for that member and vote. Riksdagen lists the person holding each seat at each vote, so partial-period members and substitutes (ersättare) are automatically measured over their own service only. Substitutes have their own `memberId` and are therefore measured separately.
2. **Present** = Ja + Nej + Avstår; **absent** = Frånvarande. Avstår counts as present.
3. **Duplicates**: if the same (`voteId`, `memberId`) appears more than once, throw — the input is invalid and must never be silently counted twice.
4. **Exclusions**: `excludeMemberIds` (e.g. the Speaker, if they ever appear in the data) are removed before any calculation, including party aggregates.
5. **Threshold**: members with `eligible < minEligibleVotes` go to `belowThreshold` instead of `ranked`. Default `minEligibleVotes = ceil(0.1 × totalVotes)` — i.e. present for at least 10 % of the period's votes — overridable by option. Below-threshold members still count towards party aggregates.
6. **Ranking**: sort by attendance desc; ties share a rank (standard competition ranking 1, 2, 2, 4). Within a tie, order by name (Swedish collation, `localeCompare(…, "sv")`), then `memberId` for determinism.
7. **Party aggregates are pooled**: `attendance = Σ present / Σ eligible` over all records with that party code. This weights by votes held and is unaffected by how many short-serving substitutes a party had. A member who changed party contributes each record to the party they belonged to at that vote.
8. **Member attributes** (name, party, constituency) are taken from the member's most recent vote (latest `date`, then `voteId` for ties).
9. No rounding anywhere in this layer; presentation rounds.

## API Surface

`lib/attendance/index.ts` exports:

- `summarize(records: readonly VoteRecord[]): AttendanceSummary`
- `computeAttendance(records: readonly VoteRecord[], options?: { minEligibleVotes?: number; excludeMemberIds?: readonly string[] }): AttendanceResult`
- the types above (`lib/attendance/types.ts`)

All functions are pure: no I/O, no globals, input arrays not mutated.

## Testing

- Add Vitest (`npm test` → `vitest run`), run in CI after typecheck.
- Fixtures are small hand-built `VoteRecord` arrays in the test file. Real-data fixtures are added in TASK-003 once the Riksdagen shape is verified.
- Cases: normal member; Avstår counted present; partial-period member measured on own votes; substitute measured separately; below-threshold member (default and explicit threshold); excluded member removed from members and parties; tie ranking and ordering; pooled party attendance vs. naive mean; party switch; latest attributes; per-riksmöte breakdown; missed vote list; duplicate (voteId, memberId) throws; empty input.

## Technical Decisions

- **Normalised input decoupled from Riksdagen's format** — lets this task proceed before data access (TASK-003) is available, and keeps the calculation testable without network. TASK-004's dependency on TASK-003 is relaxed accordingly.
- **Threshold as 10 % of votes** — simple to explain on the method page ("minst var tionde votering"); exact value can be tuned once real data is in.
- **Pooled party average** — explained on the method page; avoids substitutes with a handful of votes skewing party figures.

## Implementation Order

1. Add Vitest, `test` script, CI step
2. `lib/attendance/types.ts`
3. `lib/attendance/index.ts`
4. `lib/attendance/attendance.test.ts`
5. Run lint, typecheck, tests, build

## Files to Create/Modify

- `package.json`, `package-lock.json` — Vitest, `test` script
- `vitest.config.ts` — `@/` alias, node environment
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` — run `npm test`
- `lib/attendance/types.ts` — types
- `lib/attendance/index.ts` — `summarize`, `computeAttendance`
- `lib/attendance/attendance.test.ts` — unit tests
- `docs/tasks/TASK-004.md`, `docs/tasks/BACKLOG.md` — status, relaxed dependency
- `docs/DEVELOPMENT.md` — `npm test`
