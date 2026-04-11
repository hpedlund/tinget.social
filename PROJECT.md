# tinget.social

## Vision

**tinget.social** is a Swedish civic tech platform that makes parliamentary democracy more accessible and transparent. The name references "tinget" — the ancient Nordic assembly where citizens gathered to discuss governance.

### Phase 1 — Government Data Explorer (MVP)

A public-facing web application for exploring Swedish parliamentary (Riksdagen) open data:

- **Politicians (Ledamöter)**: Browse current and historical members of parliament — party, constituency, roles, committees, and biographical data (from ~1990 onwards)
- **Votes (Voteringar)**: Explore how parliament members voted on specific issues, with filtering by party, topic, and date (from 1993/94 onwards)
- **Speeches (Anföranden)**: Read and search chamber debate transcripts — who said what, when, and in which debate (from 1993/94 onwards)
- **Documents (Dokument)**: Access parliamentary decisions, government propositions, motions, and chamber protocols (some from 1961)
- **Calendar (Kalender)**: View upcoming debates, decisions, committee meetings, public hearings, and foreign visits

### Phase 2 — Civic Discussion Platform

Extend the platform with social features for structured political discussions:

- ID-verified accounts (BankID/Freja eID) for trust and accountability
- Direct channels between citizens and politicians
- Structured discussion threads linked to specific votes, motions, or policy areas
- An alternative to X/Facebook/Instagram for political discourse — focused on substance over engagement metrics

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | Full-stack React framework with SSR/SSG |
| **UI** | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible component library |
| **Backend** | Supabase | PostgreSQL database, Auth, Edge Functions, Realtime, Storage |
| **Auth** | Supabase Auth (email) | Email-based authentication (Phase 1); BankID integration (Phase 2) |
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
- **Server Actions for mutations** — Form submissions and data mutations use Next.js server actions
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

## Project Structure (Planned)

```
tinget.social/
├── .github/
│   ├── copilot-instructions.md    # Workspace-wide agent instructions
│   ├── agents/                    # Custom agent definitions
│   ├── instructions/              # File-specific agent instructions
│   └── skills/                    # Agent skills (on-demand workflows)
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Auth pages (login, register)
│   ├── (public)/                  # Public pages
│   │   ├── ledamoter/             # Politicians
│   │   ├── voteringar/            # Votes
│   │   ├── anforanden/            # Speeches
│   │   └── dokument/              # Documents
│   ├── api/                       # API routes
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
- **Phase 2 (BankID)**: Requires agreement with BankID provider; Swedish personal numbers are PII — handle with care
