---
description: "Use when working with Supabase — database schemas, migrations, RLS policies, Edge Functions, Auth, Realtime, or client configuration. Covers server-side and client-side Supabase patterns with @supabase/ssr."
applyTo: "**/supabase/**,**/*.sql,lib/supabase/**"
---

# Supabase Conventions

## Client Creation

Never import `@supabase/supabase-js` directly in server code. Use the `@supabase/ssr` package.

### Server Client (Server Components, Server Actions, Route Handlers)

```tsx
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components (read-only cookies)
          }
        },
      },
    }
  );
}
```

### Browser Client (Client Components)

```tsx
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Middleware Client (Auth Refresh)

```tsx
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
```

## Database Migrations

Migrations live in `supabase/migrations/` with timestamp-prefixed filenames:

```
supabase/migrations/
├── 20260411120000_create_members_cache.sql
├── 20260411120001_create_votes_cache.sql
└── 20260411120002_create_user_profiles.sql
```

### Migration Template

```sql
-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (MANDATORY)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access"
  ON table_name FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX idx_table_name_column ON table_name (column_name);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Row Level Security (RLS)

**Every table MUST have RLS enabled.** No exceptions.

### Common RLS Patterns

```sql
-- Public read, authenticated write
CREATE POLICY "Public read" ON table FOR SELECT USING (true);
CREATE POLICY "Auth insert" ON table FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own update" ON table FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own delete" ON table FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Cache tables (read-only for all, write via service role only)
CREATE POLICY "Public read" ON cache_table FOR SELECT USING (true);
-- No insert/update/delete policies = only service_role can write

-- Private user data
CREATE POLICY "Own data only" ON private_table FOR ALL TO authenticated USING (auth.uid() = user_id);
```

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-only, never expose
```

- `NEXT_PUBLIC_` prefix = safe for client-side
- `SUPABASE_SERVICE_ROLE_KEY` = bypasses RLS, server-only — never import in client components
