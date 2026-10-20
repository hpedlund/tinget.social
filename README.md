# tinget.social

**Who in the Swedish parliament actually shows up and votes?**

tinget.social is an independent, non-partisan website that uses the Swedish parliament's own open data to show how often each member of parliament (riksdagsledamot) is present and votes — and how often they are absent.

> **På svenska:** tinget.social är en oberoende och partipolitiskt obunden webbplats som visar hur ofta varje riksdagsledamot är på plats och röstar i kammaren — och hur ofta de är frånvarande. Allt bygger på riksdagens egna öppna data.

🚧 **Status:** under development — not yet live.

## What you will find

- **A ranked list of all members of parliament** by voting attendance, from most present to most absent
- **Filters** by party, constituency and period
- **A page per member** showing their attendance over time and which votes they missed
- **A party overview** so individual numbers can be compared with their party's average
- **"Så räknar vi"** — a plain-language explanation of how every number is calculated

## How attendance is measured

Every time the Riksdag votes, each member is recorded as voting *Ja* (yes), *Nej* (no), *Avstår* (abstain) or *Frånvarande* (absent).

**Attendance = the share of votes where the member voted Ja, Nej or Avstår.**

Only votes held while a person was actually serving count, so substitutes and members who joined or left mid-term are measured fairly.

### What the numbers don't tell you

Absence is not always a failure to show up for work. Members can be absent for legitimate reasons, such as:

- **Kvittning** — agreements between parties where members on opposite sides both stay away, so the outcome is unaffected
- Parental leave, illness or official duties elsewhere

The data shows *that* someone was absent, not *why*. We present the figures factually and never comment on individual members.

## The name

*Tinget* was the ancient Nordic assembly where free people gathered to settle matters of common concern. tinget.social aims to make today's assembly a little easier to follow.

## Looking ahead

Attendance is the first step. Later ideas include exploring how members voted on specific issues, their speeches and parliamentary documents — and possibly a place for structured discussion between citizens and politicians.

## Data source

All data comes from [Riksdagens öppna data](https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/), which is free for anyone to use.

**Källa: Sveriges riksdag.** tinget.social is not affiliated with the Riksdag.

## Feedback

Found an error in the data, or have a suggestion? Please [open an issue](https://github.com/hpedlund/tinget.social/issues).

---

*Technical documentation for maintaining the project is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [PROJECT.md](PROJECT.md).*
