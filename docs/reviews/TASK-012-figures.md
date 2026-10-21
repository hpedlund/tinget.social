# Figure spot-check: TASK-012

**Result**: all checked figures match Riksdagen
**Date**: 2026-10-21 · data up to the vote of 2026-10-15

## Method

1. **Automated, independent source** — `npm run data:spot-check` (`scripts/spot-check.ts`). For each sampled member and each riksmöte, it fetches Riksdagen's `/voteringlista/?iid={id}&rm={rm}` and counts Ja/Nej/Avstår/Frånvarande. That is the member's own vote list, a different endpoint from the bulk datasets and per-vote documents the pipeline reads. It compares the counts with `data/members/{id}.json` → `byRiksmote` and exits 1 on any difference.
2. **By hand** — for three members, the first and the last vote listed as missed on our member page were opened on Riksdagen's own record of the vote (`https://data.riksdagen.se/votering/{id}/html`, the link the member page uses). In each case the member is listed as Frånvarande.

The sample is chosen by rule from `data/`, to cover the cases where the method is most likely to go wrong:

| Rule | Member |
|------|--------|
| Highest attendance 2022–2026 (a substitute who joined in 2023/24) | Agneta Nilsson (S) |
| Lowest attendance 2022–2026 | Jimmie Åkesson (SD) |
| Changed party during the term (SD → politisk vilde) | Sara-Lena Bjälkö (-) |
| Politisk vilde (S → -) | Jamal El-Haj (-) |
| Below the ranking threshold, most votes | Anna Vedin (M) |
| Left the Riksdag during the term | Lars Jilmstad (M) |
| Median ranked member of the largest party | Caroline Helmersson Olsson (S) |

## Automated comparison

Counts are Ja, Nej, Avstår, Frånvarande. "data/" is our generated data; "riksdagen" is `/voteringlista/?iid=…`.

```
Agneta Nilsson (S, 0653578338415) — highest attendance 2022-2026
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0653578338415/
  2022/23  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2023/24  data/    3    3    0    0   riksdagen    3    3    0    0  OK
  2024/25  data/  208  158   78    0   riksdagen  208  158   78    0  OK
  2025/26  data/  348  337  112    0   riksdagen  348  337  112    0  OK
  2026/27  data/    0    0    0    0   riksdagen    0    0    0    0  OK
Jimmie Åkesson (SD, 051207517226) — lowest attendance 2022-2026
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_051207517226/
  2022/23  data/   13    3    6  544   riksdagen   13    3    6  544  OK
  2023/24  data/    0    2    0  593   riksdagen    0    2    0  593  OK
  2024/25  data/   21    3    8  620   riksdagen   21    3    8  620  OK
  2025/26  data/  297    1    0  499   riksdagen  297    1    0  499  OK
  2026/27  data/    0    1    0    0   riksdagen    0    1    0    0  OK
Sara-Lena Bjälkö (-, 0930305890123) — changed party
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0930305890123/
  2022/23  data/  302   88   63  108   riksdagen  302   88   63  108  OK
  2023/24  data/  397   81   67   50   riksdagen  397   81   67   50  OK
  2024/25  data/  452   98   72   30   riksdagen  452   98   72   30  OK
  2025/26  data/  780   10    3    4   riksdagen  780   10    3    4  OK
  2026/27  data/    0    0    0    0   riksdagen    0    0    0    0  OK
Jamal El-Haj (-, 0121939297619) — politisk vilde
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0121939297619/
  2022/23  data/  281  154   36   95   riksdagen  281  154   36   95  OK
  2023/24  data/  263  215   80   37   riksdagen  263  215   80   37  OK
  2024/25  data/  273  227   96   56   riksdagen  273  227   96   56  OK
  2025/26  data/  284  379  111   23   riksdagen  284  379  111   23  OK
  2026/27  data/    0    0    0    0   riksdagen    0    0    0    0  OK
Anna Vedin (M, 0163772273014) — below the threshold, most votes
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0163772273014/
  2022/23  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2023/24  data/  241    1    0    0   riksdagen  241    1    0    0  OK
  2024/25  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2025/26  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2026/27  data/    0    1    0    0   riksdagen    0    1    0    0  OK
Lars Jilmstad (M, 0722683622001) — left the Riksdag during the term
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0722683622001/
  2022/23  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2023/24  data/    0    0    0    0   riksdagen    0    0    0    0  OK
  2024/25  data/  369    1    0    0   riksdagen  369    1    0    0  OK
  2025/26  data/  418    0    0    1   riksdagen  418    0    0    1  OK
  2026/27  data/    0    0    0    0   riksdagen    0    0    0    0  OK
Caroline Helmersson Olsson (S, 0537400268911) — median ranked member of S
  https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0537400268911/
  2022/23  data/  315  163   45   43   riksdagen  315  163   45   43  OK
  2023/24  data/  269  198   79   49   riksdagen  269  198   79   49  OK
  2024/25  data/  274  197   80  101   riksdagen  274  197   80  101  OK
  2025/26  data/  306  301   88  102   riksdagen  306  301   88  102  OK
  2026/27  data/    0    0    0    0   riksdagen    0    0    0    0  OK
```

All 35 member × riksmöte rows match (7 members × 5 riksmöten).

## By hand

| Member | Vote (`votering_id`) | Riksdagen's record |
|--------|----------------------|--------------------|
| Caroline Helmersson Olsson (S) | 2AC86BD5-5360-4BC1-8A99-FF4175003DFB (first missed) | Frånvarande ✔ |
| Caroline Helmersson Olsson (S) | FE9AA10F-D23F-467E-9EAD-A602AB12B91D (last missed) | Frånvarande ✔ |
| Jimmie Åkesson (SD) | C7E795A0-9F65-49C8-A574-6CBEBF90DD0E (first missed) | Frånvarande ✔ |
| Jimmie Åkesson (SD) | FCA0CB83-25A8-4E62-927E-396AF4862C54 (last missed) | Frånvarande ✔ |
| Sara-Lena Bjälkö (SD, later -) | 0E7BC721-232A-495A-B305-FC99575F83ED (first missed) | Frånvarande, listed as SD ✔ |
| Sara-Lena Bjälkö (SD, later -) | CEEFA06F-3798-4FE4-A7EC-F814769964BA (last missed) | Frånvarande ✔ |

## Observations

- The top of the ranking is a substitute with no missed votes over about 1 250 votes. That is the documented method (each member is measured over their own service, and anyone above the 10 % threshold is ranked), and "Så räknar vi" explains it.
- riksdagen.se's member pages render their content client-side and show no vote totals, so the comparison uses Riksdagen's open-data endpoints, which the member page also links to.

## Re-running

```bash
npm run data:spot-check
```

In environments that reach the internet through a proxy, Node's `fetch` needs `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).
