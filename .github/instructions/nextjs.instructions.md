---
description: "Use when writing Next.js App Router code — pages, layouts, server components, client components, metadata, static export and data access. Covers Next.js 16 patterns, Version 1 static export constraints, and later-phase server actions."
applyTo: "**/*.tsx,**/*.ts,app/**"
---

# Next.js App Router Conventions

## Server vs Client Components

**Server Components are the default.** Only add `"use client"` when the component needs:
- Event handlers (`onClick`, `onChange`, etc.)
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser-only APIs (`window`, `localStorage`, etc.)

```tsx
// Server Component (default) — can be async; in Version 1 it runs at build time
export default async function Page() {
  const data = await fetchData();
  return <div>{data.title}</div>;
}

// Client Component — only when interactivity required
"use client";
export function SearchFilter({ onFilter }: { onFilter: (q: string) => void }) {
  const [query, setQuery] = useState("");
  // ...
}
```

## Static Export (Version 1)

Version 1 is built with `output: "export"` and served from GitHub Pages. Everything renders at **build time**.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,          // /ledamoter/123/ → ledamoter/123/index.html
  images: { unoptimized: true }, // no image optimisation server
};

export default nextConfig;
```

With the custom domain (`tinget.social`) the site is served from the root, so no `basePath` is needed. Without it, GitHub Pages serves the site under `/<repo-name>/` and `basePath` must be set to match.

Not available — do not use in Version 1:

- Server Actions (`"use server"`), Route Handlers that run per request, Middleware
- `cookies()`, `headers()`, reading `searchParams` in Server Components
- `revalidate` / ISR, `next/image` optimisation
- Dynamic routes without `generateStaticParams`

Interactive filtering/sorting reads URL query state in a **Client Component** (`useSearchParams`, wrapped in `<Suspense>`) over data already embedded in the page.

## Route Organization

```
app/
├── layout.tsx             # Root layout (header, footer with "Källa: Sveriges riksdag")
├── page.tsx               # Start page: attendance ranking
├── not-found.tsx          # 404 (exported as 404.html)
├── ledamoter/
│   └── [id]/
│       └── page.tsx       # Member attendance detail (generateStaticParams)
├── partier/
│   └── page.tsx           # Party overview
└── sa-raknar-vi/
    └── page.tsx           # Methodology
```

Later phases add route groups such as `(auth)/`, `(dashboard)/` and `api/` — only once the backend (Supabase + Node hosting) is introduced.

## Data Access

Pages get data only through `lib/data/`:

```tsx
// app/page.tsx — Server Component, runs at build time
import { getRanking } from "@/lib/data";

export default async function Page() {
  const ranking = await getRanking("2022-2026");
  return <RankingTable rows={ranking.members} />;
}
```

## Error and Not-Found States

- Data is validated at build time — a missing or invalid data file must **fail the build**, not render an error page
- Provide `app/not-found.tsx` for unknown URLs
- `error.tsx` is only needed around Client Components that can fail at runtime
- `loading.tsx` is generally unnecessary for statically exported pages; use Skeletons only for client-side loading

## Server Actions (later phases only)

Once the backend is introduced and static export is switched off, use Server Actions for all mutations:

```tsx
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({ title: z.string().min(1).max(200) });

export async function createPost(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid input", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert(parsed.data);

  if (error) {
    return { error: "Failed to create post", code: "DB_ERROR" };
  }

  revalidatePath("/posts");
}
```

## Metadata

```tsx
// Static metadata
export const metadata = {
  title: "Närvaro i riksdagen — tinget.social",
  description: "Vilka ledamöter är på plats och röstar?",
};

// Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(id);
  return {
    title: `${member.name} — tinget.social`,
    description: `Närvaro i voteringar för ${member.name} (${member.party})`,
  };
}
```

## Dynamic Routes with Static Generation

```tsx
// app/ledamoter/[id]/page.tsx
import { getAllMemberIds } from "@/lib/data";

export const dynamicParams = false; // required for static export

export async function generateStaticParams() {
  const members = await getAllMemberIds();
  return members.map((id) => ({ id }));
}
```
