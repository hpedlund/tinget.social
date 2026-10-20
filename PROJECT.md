# tinget.social — Project Plan

## Vision

**tinget.social** is a Swedish civic tech platform that makes parliamentary democracy more accessible and transparent. The name references "tinget" — the ancient Nordic assembly where citizens gathered to discuss governance.

The long-term ambition is a place to explore Riksdagen open data and, eventually, to hold structured political discussions. We get there one small, useful step at a time — starting with a single question citizens can't easily answer today:

> **Are the members of parliament actually showing up and voting?**

### Version 1 — Attendance Ranking (MVP)

An open, public website (no accounts, no login) that uses Riksdagen open data to rank members of parliament (ledamöter) by how often they are present and vote in the chamber — and, just as clearly, who is not.

**In scope**

- **Ranked list**: All members ranked by voting attendance — share of votes (voteringar) where they cast a vote (`Ja`, `Nej` or `Avstår`) versus were absent (`Frånvarande`). Sortable both ways: most present first and most absent first.
- **Filters**: Party, constituency (valkrets), and period (parliamentary year / riksmöte, e.g. `2025/26`, or full electoral term).
- **Member detail page**: Attendance over time for one member — totals per vote type, trend per riksmöte, and the list of votes they missed.
- **Party overview**: Average attendance per party, so individual numbers can be put in context.
- **Transparent method**: A public "Så räknar vi" (how we calculate) page explaining the metric, its limitations, and linking to the raw Riksdagen data. Every number must be traceable back to the source.
- **Attribution**: "Källa: Sveriges riksdag" on every page showing data.

**Out of scope for Version 1**

- User accounts, authentication, comments or any user-generated content
- Speeches (anföranden), documents (dokument) and calendar (kalender) exploration
- How members voted on specific issues (only *whether* they voted)
- Historical data before the electoral terms needed for the ranking

**Attendance metric (definition)**

```
attendance % = (Ja + Nej + Avstår) / (Ja + Nej + Avstår + Frånvarande)
```

- Only votes held while the person was actually serving (tjänstgörande) count. Members who served part of a period are measured over the votes during their own service, and members below a minimum number of eligible votes are listed separately rather than ranked.
- `Avstår` (abstain) counts as **present** — the member showed up and took a position.
- **Fairness caveats** that must be shown in the UI, not hidden: absence can be legitimate — e.g. *kvittning* (pairing agreements between parties), parental leave, illness, or official duties. When a member is on longer leave an ersättare (substitute) takes the seat and is measured separately. The Speaker (talman) does not normally vote and is excluded. The data shows *that* someone was absent, not *why*.

### Later Phases (not committed)

These remain part of the long-term vision but are explicitly **not** part of Version 1:

- **Government Data Explorer** — browse members (from ~1990), how they voted per issue (from 1993/94), speeches, documents, and the parliamentary calendar.
- **Civic Discussion Platform** — ID-verified accounts (BankID/Freja eID), direct channels between citizens and politicians, structured discussion threads linked to votes and motions; an alternative to X/Facebook/Instagram for political discourse, focused on substance over engagement metrics.

## Technology Stack

Version 1 is a **static website**: all data is downloaded and processed at build time, and the result is plain HTML, CSS, JS and JSON served from GitHub Pages. There is no server, database or login.

| Layer | Version 1 | Later (when needed) |
|-------|-----------|---------------------|
| **Frontend** | Next.js 15 (App Router) with static export (`output: "export"`) | Same app with static export switched off (SSR/ISR) |
| **UI** | Tailwind CSS + shadcn/ui | Same |
| **Language** | TypeScript (strict mode) | Same |
| **Data pipeline** | Node/TypeScript scripts run in GitHub Actions | Same scripts, writing to Supabase instead of / as well as JSON |
| **Data storage** | Generated JSON files committed to the repository (`data/`) | Supabase PostgreSQL (EU region) |
| **Auth** | None | Supabase Auth; BankID/Freja eID for verified accounts |
| **Hosting** | GitHub Pages (custom domain `tinget.social`) | Node hosting, e.g. Hetzner VM (Docker/Coolify) or Vercel |
| **Data source** | Riksdagen öppna data | Same |

## Data Sources

### Riksdagen Öppna Data

**Base URL**: `https://data.riksdagen.se`
**Documentation**: https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/
**License**: Free to use, no fees or licenses. Must attribute **Sveriges riksdag** as source.

| API | Endpoint Pattern | Data Available From | Used in Version 1 |
|-----|-----------------|-------------------|-------------------|
| Ledamöter (Members) | `/personlista/` | ~1990 | Yes — names, party, constituency, service periods |
| Voteringar (Votes) | `/voteringlista/` | 1993/94 | Yes — one row per member per vote, incl. `Frånvarande` |
| Anföranden (Speeches) | `/anforandelista/` | 1993/94 | No |
| Dokument (Documents) | `/dokumentlista/` | 1961 (some types) | No |
| Kalender (Calendar) | `/kalender/` | Current | No |

Riksdagen also publishes **bulk datasets** (zipped files per riksmöte) under `https://data.riksdagen.se/dataset/`. The pipeline should prefer these over paging the API for full-year vote data; confirm exact file names when implementing the pipeline.

**Response formats**: JSON, XML, CSV (datasets)
**Rate limits**: Not formally documented — the pipeline runs at most once a day, throttles requests and caches downloads.

## Architecture Overview

### Version 1 — Static site

```
┌──────────────────────── GitHub Actions ────────────────────────┐
│  schedule (daily) · push to main · manual                      │
│                                                                 │
│  1. fetch      data.riksdagen.se ──► raw downloads (CI cache)   │
│  2. compute    validate (zod) + calculate attendance            │
│                ──► data/*.json  (committed when changed)        │
│  3. build      next build (static export) ──► out/              │
│  4. deploy     out/ ──► GitHub Pages                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Browser: static HTML pages + small JSON files
        (filtering & sorting happen client-side)
```

### Data access layer — the seam that keeps Supabase open

Pages never read JSON files or call Riksdagen directly. All reads go through typed functions in `lib/data/` (e.g. `getRanking(period)`, `getMember(id)`, `getParties(period)`), returning types defined in `lib/data/types.ts` and validated with `zod`.

- **Version 1**: these functions read the generated JSON files at build time.
- **Later**: the same functions can be re-implemented against Supabase without touching pages or components.

The generated JSON files are the **data contract** between the pipeline and the site. Keep them small, versioned (`schemaVersion` field) and documented in `data/README.md`.

### Key Architectural Decisions

- **Static first** — Version 1 is fully static; any feature needing a request-time server is out of scope until the backend is introduced
- **Server Components by default** — Rendered at build time; Client Components only for interactivity (filters, sorting)
- **Precomputed statistics** — Attendance is calculated in the pipeline, never in the browser or per request
- **Committed data snapshots** — Generated JSON is committed, giving a public, dated history of every number (transparency) and reproducible builds
- **Single data access layer** — `lib/data/` is the only place that knows where data comes from
- **No secrets** — Version 1 needs no API keys or credentials; the deploy uses GitHub's built-in Pages permissions
- **No tracking** — No cookies, analytics or third-party scripts in Version 1

### Static export constraints (Version 1)

Because the site is built with `output: "export"`, the following Next.js features are **not available** and must not be used:

- Server Actions, Route Handlers that run per request (`app/api/**`), Middleware
- `cookies()`, `headers()`, request-time `searchParams` in Server Components
- ISR / `revalidate`, `next/image` optimisation (use `unoptimized`)
- Dynamic routes without `generateStaticParams` (set `dynamicParams = false`)

Filters are therefore implemented client-side (URL query state read in a Client Component).

### When to introduce Supabase (kept open)

Supabase remains the intended backend for later phases. Introduce it when one of these becomes true — not before:

- Users need accounts, comments or any write operations (Civic Discussion Platform)
- Data no longer fits comfortably in static files (e.g. full vote history per issue, full-text search over speeches)
- Data must be fresher than a daily rebuild
- Queries need to be ad-hoc rather than precomputed

Migration path: create a Supabase project (EU region), add migrations under `supabase/migrations/`, make the pipeline write to Supabase, re-implement `lib/data/` against it, switch off static export and move hosting to a Node host (Hetzner VM or Vercel). The conventions for that stage are already documented in `.github/instructions/supabase.instructions.md` and `.github/skills/data-modeling/`.

## Deployment

### Version 1 — GitHub Pages

- Deployed by a GitHub Actions workflow using the official Pages actions (`actions/upload-pages-artifact`, `actions/deploy-pages`)
- Triggers: push to `main`, a daily schedule (data refresh) and manual dispatch
- Custom domain `tinget.social` via a `CNAME` file and DNS records at the registrar; HTTPS provided by GitHub Pages
- Requirements: a public repository (or a paid GitHub plan for Pages on private repositories)
- Limits that matter: 1 GB published site, soft limit of 100 GB/month bandwidth, 10 builds/hour — all far above Version 1 needs
- Scheduled workflows in public repositories are paused after 60 days without repository activity; the daily data commit keeps the repository active

### Later — backend and server hosting

When the backend is introduced: Supabase (EU region) for database and auth, and a Node host for the frontend — a Hetzner VM (Docker/Coolify) is the preferred option for EU hosting and control.

## Project Structure (Planned — Version 1)

```
tinget.social/
├── .github/
│   ├── copilot-instructions.md    # Workspace-wide agent instructions
│   ├── agents/                    # Custom agent definitions
│   ├── instructions/              # File-specific agent instructions
│   ├── skills/                    # Agent skills (on-demand workflows)
│   └── workflows/                 # CI: build, data refresh, Pages deploy
├── app/                           # Next.js App Router (static export)
│   ├── page.tsx                   # Start page: attendance ranking
│   ├── ledamoter/[id]/            # Member attendance detail
│   ├── partier/                   # Party attendance overview
│   ├── sa-raknar-vi/              # Methodology ("how we calculate")
│   └── layout.tsx                 # Root layout
├── components/                    # Shared UI components
│   ├── ui/                        # shadcn/ui components
│   └── ...                        # Feature components
├── lib/
│   ├── data/                      # Data access layer (JSON now, Supabase later)
│   ├── attendance/                # Attendance calculation (pure, unit-tested)
│   ├── riksdagen/                 # Riksdagen API/dataset client + zod schemas
│   └── utils.ts                   # General utilities
├── scripts/                       # Pipeline entry points (fetch, compute)
├── data/                          # Generated JSON (committed) + README.md
├── public/                        # Static assets, CNAME
├── PROJECT.md                     # This file
├── docs/                          # Development guide, tasks, specs, reviews
└── README.md                      # Public project description
```

Added later with the backend: `supabase/` (migrations, seed), `lib/supabase/`, `app/api/`.

## Development Workflow

The project is built with an agentic, task-driven workflow (@planner → @architect → @coder → @security → @ux). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Legal & Compliance

- **Riksdagen data**: Free to use, must attribute "Sveriges riksdag" as source
- **GDPR (Version 1)**: No user data is collected — no accounts, cookies, analytics or contact forms. GitHub Pages may log visitor IP addresses for security purposes; mention this in a short privacy note on the site
- **GDPR (later)**: User data stored in Supabase (EU region); minimize PII collection; implement data deletion flows
- **Accessibility**: Target WCAG 2.1 AA compliance for all public-facing pages
- **Personal data about politicians**: Attendance figures concern public officials acting in their public role, sourced from public records; present them factually, with method and caveats, and never editorialise about individuals
- **Later phase (BankID)**: Requires agreement with BankID provider; Swedish personal numbers are PII — handle with care
