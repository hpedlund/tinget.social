# tinget.social

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

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | Full-stack React framework with SSR/SSG |
| **UI** | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible component library |
| **Backend** | Supabase | PostgreSQL database for cached vote data and precomputed attendance statistics; Edge Functions / scheduled jobs for data sync |
| **Auth** | None (Version 1) | Version 1 is fully public and read-only; Supabase Auth / BankID only in later phases |
| **Language** | TypeScript (strict mode) | Type safety throughout the stack |
| **Data Source** | Riksdagen öppna data | Swedish parliament open data APIs |
| **Deployment** | TBD | Supabase (backend) + Vercel or Hetzner/Coolify (frontend) |

## Data Sources

### Riksdagen Öppna Data

**Base URL**: `https://data.riksdagen.se`
**Documentation**: https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/
**License**: Free to use, no fees or licenses. Must attribute **Sveriges riksdag** as source.

| API | Endpoint Pattern | Data Available From |
|-----|-----------------|-------------------|
| Ledamöter (Members) | `/personlista/` | ~1990 |
| Voteringar (Votes) | `/voteringlista/` | 1993/94 |
| Anföranden (Speeches) | `/anforandelista/` | 1993/94 |
| Dokument (Documents) | `/dokumentlista/` | 1961 (some types) |
| Kalender (Calendar) | `/telefonkatalog/` | Current |

**Response formats**: JSON, XML
**Rate limits**: Not formally documented — implement client-side rate limiting and caching.
**Contact**: riksdagsinformation@riksdagen.se / 020-349 000

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Server   │  │  Client  │  │   Server Actions  │  │
│  │Components │  │Components│  │  (mutations)      │  │
│  └─────┬─────┘  └─────┬────┘  └────────┬──────────┘  │
│        │              │               │              │
│  ┌─────┴──────────────┴───────────────┴──────────┐  │
│  │            Data Layer / API Routes             │  │
│  └──────────┬─────────────────┬──────────────────┘  │
└─────────────┼─────────────────┼──────────────────────┘
              │                 │
    ┌─────────▼──────┐  ┌──────▼──────────┐
    │   Supabase     │  │  Riksdagen API  │
    │  (PostgreSQL,  │  │  (External,     │
    │   Auth, RLS)   │  │   cached)       │
    └────────────────┘  └─────────────────┘
```

### Key Architectural Decisions

- **Server Components by default** — Client components only when interactivity is required
- **Read-only public site (Version 1)** — No user mutations; data is written only by the sync job
- **Precomputed statistics** — Attendance figures are computed when vote data is synced, not per page request
- **Supabase server client** — Use `@supabase/ssr` for server-side auth and data access
- **External API caching** — Riksdagen API responses cached in Supabase (PostgreSQL) with configurable TTL to reduce external calls and improve performance
- **Row Level Security (RLS)** — All Supabase tables must have RLS policies; no public access without explicit policies
- **Incremental Static Regeneration (ISR)** — Static pages for politician profiles and historical votes; revalidated periodically

## Deployment

### Backend — Supabase

Supabase hosts the database, authentication, edge functions, and realtime subscriptions. Supabase cannot host the Next.js frontend application.

**Recommendation**: Use the Supabase free tier during development; upgrade to Pro when launching.

### Frontend — Options

| Option | Pros | Cons |
|--------|------|------|
| **Vercel** (free tier) | Native Next.js support, zero config, edge network | US-based (data stays in EU via Supabase), free tier limits |
| **Hetzner + Coolify** | EU-based, cheap (~€4/month), full control, Docker | Self-managed, requires Docker/Coolify setup |
| **Cloudflare Pages** | Edge network, generous free tier, EU PoPs | Requires `@cloudflare/next-on-pages` adapter |

**Recommendation**: Start with Vercel free tier for simplicity; evaluate Hetzner+Coolify for production if EU data sovereignty is a priority.

## Project Structure (Planned — Version 1)

```
tinget.social/
├── .github/
│   ├── copilot-instructions.md    # Workspace-wide agent instructions
│   ├── agents/                    # Custom agent definitions
│   ├── instructions/              # File-specific agent instructions
│   └── skills/                    # Agent skills (on-demand workflows)
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Start page: attendance ranking
│   ├── ledamoter/[id]/            # Member attendance detail
│   ├── partier/                   # Party attendance overview
│   ├── sa-raknar-vi/              # Methodology ("how we calculate")
│   ├── api/                       # API routes / sync endpoints
│   └── layout.tsx                 # Root layout
├── components/                    # Shared UI components
│   ├── ui/                        # shadcn/ui components
│   └── ...                        # Feature components
├── lib/                           # Shared utilities
│   ├── supabase/                  # Supabase client config
│   ├── riksdagen/                 # Riksdagen API client
│   └── utils.ts                   # General utilities
├── supabase/
│   ├── migrations/                # Database migrations
│   └── seed.sql                   # Seed data
├── public/                        # Static assets
├── PROJECT.md                     # This file
└── README.md                      # Quick start guide
```

## Development Workflow

This project uses an **agentic development workflow** with specialized AI agents:

1. **@architect** — Designs features, data models, and API surfaces (read-only)
2. **@coder** — Implements designs following project conventions (full tools)
3. **@security** — Reviews for OWASP Top 10, GDPR, and Supabase RLS compliance (read-only)
4. **@ux** — Reviews accessibility (WCAG 2.1 AA), responsive design, and UX patterns (read-only)
5. **@orchestrator** — Chains all agents for end-to-end feature development

### Feature Development Flow

```
Feature Request → @orchestrator
    └→ @architect (design spec)
        └→ @coder (implementation)
            └→ @security (security review)
                └→ @ux (UX review)
                    └→ Done (or back to @coder for fixes)
```

## Legal & Compliance

- **Riksdagen data**: Free to use, must attribute "Sveriges riksdag" as source
- **GDPR**: User data stored in Supabase (EU region); minimize PII collection; implement data deletion flows
- **Accessibility**: Target WCAG 2.1 AA compliance for all public-facing pages
- **Personal data about politicians**: Attendance figures concern public officials acting in their public role, sourced from public records; present them factually, with method and caveats, and never editorialise about individuals
- **Later phase (BankID)**: Requires agreement with BankID provider; Swedish personal numbers are PII — handle with care
