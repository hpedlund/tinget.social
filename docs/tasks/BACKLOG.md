# Backlog

> Next ID: TASK-014

Version 1 — attendance ranking (see [PROJECT.md](../../PROJECT.md)). Ordered by dependency chain.

- **Critical path**: 001 → 003 + 004 → 005 → 006 → 007 → 012
- **In parallel**: 002 after 001 · 008, 009, 010 once 002 and 005 (010: 004) are done · 011 after 005
- **Blocked on DNS**: 013

## In Progress

| ID | Title | Status | Branch | Dependencies |
|----|-------|--------|--------|--------------|

## Backlog

| ID | Title | Status | Priority | Dependencies |
|----|-------|--------|----------|--------------|
| TASK-007 | [Ranking filters and sorting](TASK-007.md) | draft | medium | TASK-006 |
| TASK-008 | [Member detail page](TASK-008.md) | draft | medium | TASK-005, TASK-002 |
| TASK-009 | [Party overview page](TASK-009.md) | draft | medium | TASK-005, TASK-002 |
| TASK-010 | [Methodology page (Så räknar vi)](TASK-010.md) | draft | high | TASK-004, TASK-002 |
| TASK-011 | [Daily data refresh](TASK-011.md) | draft | medium | TASK-005 |
| TASK-012 | [Pre-launch review](TASK-012.md) | draft | medium | TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011 |
| TASK-013 | [Custom domain tinget.social](TASK-013.md) | draft | low | TASK-001 |

## Done

| ID | Title | Branch | Completed |
|----|-------|--------|-----------|
| TASK-001 | [Project setup, default page and GitHub Pages deploy](TASK-001.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-002 | [Site layout and static page shell](TASK-002.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-003 | [Riksdagen data client and fetch script](TASK-003.md) | task/003-riksdagen-fetch | 2026-10-20 |
| TASK-004 | [Attendance calculation](TASK-004.md) | claude/happy-thompson-ua33kk | 2026-10-20 |
| TASK-005 | [Data contract and data access layer](TASK-005.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
| TASK-006 | [Attendance ranking page](TASK-006.md) | claude/focused-pascal-1h7rnf | 2026-10-20 |
