---
name: data-modeling
description: "Design Supabase/PostgreSQL database schemas, generate RLS policies, and create migration files. Use when planning data models, designing table relationships, or creating database migrations for tinget.social."
argument-hint: "Describe the data you need to model (e.g., 'user profiles with favorites')"
---

# Data Modeling Skill

Design and create Supabase/PostgreSQL schemas with proper security, relations, and migrations.

## When to Use

- Planning a new database table or schema
- Designing relationships between tables
- Creating RLS policies for data access control
- Generating migration files
- Designing cache tables for Riksdagen API data

## Procedure

### 1. Gather Requirements

Understand what data needs to be stored:
- What entities are involved?
- What are the relationships (1:1, 1:N, N:M)?
- Who can read/write this data?
- Is this user data or cached external data?

### 2. Design the Schema

Follow these conventions:
- `UUID` primary keys with `gen_random_uuid()` default
- `TIMESTAMPTZ` for all timestamps (`created_at`, `updated_at`)
- `TEXT` over `VARCHAR` unless a hard limit is needed
- Foreign keys with `ON DELETE` behavior specified
- Indexes on columns used in WHERE clauses and JOINs

### 3. Design RLS Policies

Every table MUST have RLS enabled. Common patterns:

| Data Type | Read | Write |
|-----------|------|-------|
| Public content | `USING (true)` | Authenticated + ownership check |
| User private data | `USING (auth.uid() = user_id)` | Same |
| Cache tables | `USING (true)` | Service role only (no write policy) |
| Admin data | `USING (is_admin(auth.uid()))` | Same |

### 4. Generate Migration

Create the SQL migration file:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "policy_name" ON table_name
  FOR operation TO role
  USING (condition)
  WITH CHECK (condition);

-- Indexes
CREATE INDEX idx_name ON table_name (column);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 5. Generate TypeScript Types

Create matching TypeScript interfaces:

```tsx
// types.ts
export interface TableName {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TableNameInsert {
  // Omit auto-generated fields
}

export interface TableNameUpdate {
  // Partial of insertable fields
}
```

### 6. Verify

- [ ] Every table has RLS enabled
- [ ] RLS policies use `auth.uid()` — not client-provided IDs
- [ ] Foreign keys have appropriate `ON DELETE` behavior
- [ ] Indexes cover common query patterns
- [ ] TypeScript types match the SQL schema
- [ ] Migration filename follows `YYYYMMDDHHMMSS_description.sql` pattern

## Riksdagen Cache Table Pattern

For caching external API data:

```sql
CREATE TABLE IF NOT EXISTS riksdagen_members_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,  -- Riksdagen's ID
  data JSONB NOT NULL,               -- Raw API response
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

ALTER TABLE riksdagen_members_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON riksdagen_members_cache
  FOR SELECT USING (true);

CREATE INDEX idx_riksdagen_members_external_id
  ON riksdagen_members_cache (external_id);

CREATE INDEX idx_riksdagen_members_expires_at
  ON riksdagen_members_cache (expires_at);
```
