---
description: "Use when building API routes or route handlers in Next.js App Router. Covers request validation, error handling, Supabase server client usage, and consistent response formats."
applyTo: "app/api/**"
---

# API Route Conventions

## Route Handler Pattern

```tsx
// app/api/example/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("table")
    .select()
    .range(
      (parsed.data.page - 1) * parsed.data.limit,
      parsed.data.page * parsed.data.limit - 1
    );

  if (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
```

## Error Response Format

All API routes must return consistent error format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

### Standard Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource does not exist |
| `DB_ERROR` | 500 | Database operation failed |
| `EXTERNAL_API_ERROR` | 502 | Riksdagen API call failed |

## Input Validation

**Every API route must validate all inputs with `zod`.**

```tsx
// Path parameters
const paramsSchema = z.object({ id: z.string().uuid() });

// Query parameters
const querySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  party: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

// Request body (POST/PUT)
const bodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
});
```

## Authentication Checks

For protected routes, verify the user session:

```tsx
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // User is authenticated, proceed...
}
```

## External API Proxy (Riksdagen)

When proxying Riksdagen API calls, add caching headers and error handling:

```tsx
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const response = await fetch(
    `https://data.riksdagen.se/personlista/?${searchParams.toString()}&utformat=json`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );

  if (!response.ok) {
    console.error("Riksdagen API error:", response.status);
    return NextResponse.json(
      { error: "External API unavailable", code: "EXTERNAL_API_ERROR" },
      { status: 502 }
    );
  }

  const data = await response.json();
  return NextResponse.json({ data });
}
```

## Prefer Server Actions over API Routes

For mutations (form submissions, data writes), use **Server Actions** instead of API routes. API routes are best for:
- External webhook receivers
- Proxying external APIs (Riksdagen)  
- Public endpoints consumed by external clients
- Long-running operations
