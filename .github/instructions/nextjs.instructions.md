---
description: "Use when writing Next.js App Router code — pages, layouts, server components, client components, server actions, route handlers, metadata, or middleware. Covers Next.js 15 patterns and conventions."
applyTo: "**/*.tsx,**/*.ts,app/**"
---

# Next.js App Router Conventions

## Server vs Client Components

**Server Components are the default.** Only add `"use client"` when the component needs:
- Event handlers (`onClick`, `onChange`, etc.)
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser-only APIs (`window`, `localStorage`, etc.)

```tsx
// Server Component (default) — can be async, can access DB directly
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

## Route Organization

```
app/
├── (public)/              # Public pages — shared public layout
│   ├── layout.tsx
│   ├── page.tsx           # Home page
│   ├── ledamoter/         # Politicians
│   │   ├── page.tsx       # List view
│   │   └── [id]/
│   │       └── page.tsx   # Detail view
│   ├── voteringar/        # Votes
│   └── anforanden/        # Speeches
├── (auth)/                # Auth pages — shared auth layout
│   ├── layout.tsx
│   ├── login/
│   └── register/
├── (dashboard)/           # Authenticated user area
│   └── layout.tsx
├── api/                   # API routes
├── layout.tsx             # Root layout
├── loading.tsx            # Root loading
└── error.tsx              # Root error boundary
```

## Error Boundaries

Every route group must have:
- `loading.tsx` — Shown during navigation/data fetching (use Skeleton components)
- `error.tsx` — Shown on unhandled errors (must be a client component)

```tsx
// loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <Skeleton className="h-96 w-full" />;
}

// error.tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Server Actions

Use for all mutations. Define in separate files or inline with `"use server"`:

```tsx
// app/(dashboard)/actions.ts
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
  title: "Ledamöter — tinget.social",
  description: "Utforska riksdagens ledamöter",
};

// Dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(id);
  return {
    title: `${member.name} — tinget.social`,
    description: `Information om ${member.name}, ${member.party}`,
  };
}
```

## Dynamic Routes with Static Generation

```tsx
// app/(public)/ledamoter/[id]/page.tsx
export async function generateStaticParams() {
  const members = await getAllMemberIds();
  return members.map((id) => ({ id }));
}
```
