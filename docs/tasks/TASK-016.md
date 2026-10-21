# TASK-016: What Ja and Nej meant: counter-proposal and outcome

**Status**: draft
**Priority**: high
**Depends on**: TASK-014
**Branch**: task/016-motforslag

## Goal

Every betänkande vote says which counter-proposal Nej stood for and which parties were behind it, and which side won.

## Details

- Source: `/utskottsforslag/{dok_id}.json`, already cached: `dokmotforslag.motforslag[]` (`nummer`, `partier`, `typ`, `utskottsforslag_punkt`) and per point `motforslag_nummer`, `vinnare`, `voteringskrav`. Observed 2025/26: 775 of 782 votes name the counter-proposal's parties
- Data: votes gain `motforslag: { typ, nummer, partier[] } | null` and `outcome` (`utskottet` / `motforslag`); contract change → `schemaVersion` 3
- Document page: per vote "Ja: utskottets förslag · Nej: reservation 3 (S, V, C, MP) · Utskottets förslag vann"
- Member vote list: sub-line shows the counter-proposal's parties for Nej ballots
- Neutral wording only; no "for/against" interpretation

## Acceptance Criteria

- [ ] Counter-proposal and outcome shown for every vote that has them; nothing shown (not guessed) where the source has none
- [ ] Contract v3 documented in `data/README.md`; figures unchanged
- [ ] Unit tests for parsing `partier` (quoted, comma-separated) and the join on point number
- [ ] Lint, typecheck, tests, `data:check` and build pass

## Artifacts

- Spec: `docs/specs/TASK-016.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-016-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-016-ux.md` *(created by @ux)*
