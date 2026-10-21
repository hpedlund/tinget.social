# Backlog

> Next ID: TASK-024

Version 1 — attendance ranking (see [PROJECT.md](../../PROJECT.md)). Ordered by dependency chain.

- **Critical path**: 001 → 003 + 004 → 005 → 006 → 007 → 012
- **In parallel**: 002 after 001 · 008, 009, 010 once 002 and 005 (010: 004) are done · 011 after 005

Follow-ups to TASK-014 (how members voted and what it was about), by feature:

| Feature | Tasks | Order |
|---------|-------|-------|
| Summaries | 015 → 023 | 015 first: the only work needed to put AI summaries live |
| Understanding a vote | 016, 017 | Independent; 016 first — it answers "what did Nej mean?" |
| Finding votes | 018 → 019 · 020 | 018 before 019; 020 any time |
| Member context | 021 (after 017) | Needs a product decision before design |
| Robustness | 022 | Any time |

## In Progress

| ID | Title | Status | Branch | Dependencies |
|----|-------|--------|--------|--------------|

## Backlog

| ID | Title | Status | Priority | Dependencies |
|----|-------|--------|----------|--------------|
| TASK-015 | [Generate and review AI summaries](TASK-015.md) | draft | high | TASK-014 |
| TASK-016 | [What Ja and Nej meant: counter-proposal and outcome](TASK-016.md) | draft | high | TASK-014 |
| TASK-017 | [How each party voted](TASK-017.md) | draft | medium | TASK-014 |
| TASK-018 | [Vote index per riksmöte](TASK-018.md) | draft | medium | TASK-014 |
| TASK-021 | [Votes that differ from the party majority](TASK-021.md) | draft (decision needed) | medium | TASK-017 |
| TASK-019 | [Committees (utskott) on votes](TASK-019.md) | draft | low | TASK-018 |
| TASK-020 | [Shareable member vote filters](TASK-020.md) | draft | low | TASK-014 |
| TASK-022 | [Member vote list without JavaScript](TASK-022.md) | draft | low | TASK-014 |
| TASK-023 | [Document coverage in the data refresh summary](TASK-023.md) | draft | low | TASK-015 |

## Done

| ID | Title | Branch | Completed |
|----|-------|--------|-----------|
| TASK-001 | [Project setup, default page and GitHub Pages deploy](TASK-001.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-002 | [Site layout and static page shell](TASK-002.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-003 | [Riksdagen data client and fetch script](TASK-003.md) | task/003-riksdagen-fetch | 2026-10-20 |
| TASK-004 | [Attendance calculation](TASK-004.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-005 | [Data contract and data access layer](TASK-005.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-006 | [Attendance ranking page](TASK-006.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-007 | [Ranking filters and sorting](TASK-007.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-008 | [Member detail page](TASK-008.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-009 | [Party overview page](TASK-009.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-010 | [Methodology page (Så räknar vi)](TASK-010.md) | claude/focused-pascal-1h7rnf | 2026-10-21 |
| TASK-011 | [Daily data refresh](TASK-011.md) | claude/focused-pascal-1h7rnf | 2026-10-21 |
| TASK-012 | [Pre-launch review](TASK-012.md) | claude/focused-pascal-1h7rnf | 2026-10-21 |
| TASK-013 | [Custom domain tinget.social](TASK-013.md) | claude/focused-pascal-1h7rnf | 2026-10-21 |
| TASK-014 | [How members voted and what the votes were about](TASK-014.md) | claude/beautiful-edison-nbmjrk | 2026-10-21 |
