---
name: security-review
description: "Perform security reviews following OWASP Top 10, GDPR compliance checks, Supabase RLS audits, and authentication flow reviews. Use when auditing code security, checking data privacy compliance, or reviewing Supabase policies for tinget.social."
argument-hint: "What should be reviewed? (e.g., 'new user registration flow')"
---

# Security Review Skill

Systematic security review for Swedish civic tech platform handling parliamentary data and user information.

## When to Use

- Reviewing new features for security vulnerabilities
- Auditing Supabase RLS policies
- Checking GDPR compliance for user data handling
- Reviewing authentication/authorization flows
- Verifying input validation coverage
- Pre-launch security checklist

## Procedure

### 1. Identify Attack Surface

List all entry points in the feature:
- API routes (`app/api/**`)
- Server actions (`"use server"` functions)
- Client-side forms and inputs
- External API integrations (Riksdagen)
- Database tables and RLS policies
- Environment variables and secrets

### 2. OWASP Top 10 Review

Check each applicable category:

#### A01: Broken Access Control
- [ ] Every Supabase table has RLS enabled
- [ ] RLS policies use `auth.uid()` — not client-provided IDs
- [ ] Server actions verify user authentication before mutations
- [ ] No direct object references without authorization checks
- [ ] Route protection via middleware for authenticated sections

#### A02: Cryptographic Failures
- [ ] No secrets in client-side code (check for `NEXT_PUBLIC_` misuse)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never imported in client components
- [ ] Passwords handled exclusively by Supabase Auth (never stored manually)
- [ ] HTTPS enforced in production

#### A03: Injection
- [ ] All database queries use Supabase client (parameterized by default)
- [ ] No raw SQL string concatenation
- [ ] No `eval()` or `Function()` constructors
- [ ] URL parameters validated before use

#### A04: Insecure Design
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after failed attempts (Supabase Auth handles this)
- [ ] No sensitive operations in GET requests

#### A05: Security Misconfiguration
- [ ] No debug mode or verbose errors in production
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Default Supabase credentials changed
- [ ] `.env.local` in `.gitignore`

#### A06: Vulnerable Components
- [ ] Dependencies up to date (`npm audit`)
- [ ] No known vulnerable packages

#### A07: Authentication Failures
- [ ] Session handling via Supabase Auth + `@supabase/ssr`
- [ ] Token refresh handled in middleware
- [ ] Logout clears all session data

#### A08: Data Integrity Failures
- [ ] User input validated with `zod` at every boundary
- [ ] No `dangerouslySetInnerHTML` without DOMPurify sanitization
- [ ] External API data (Riksdagen) treated as untrusted

#### A09: Logging Failures
- [ ] Security-relevant events logged server-side
- [ ] No PII or credentials in logs
- [ ] Errors return generic messages to clients

#### A10: Server-Side Request Forgery (SSRF)
- [ ] External URLs validated before fetching
- [ ] Riksdagen API calls use hardcoded base URL
- [ ] No user-controlled URLs in server-side fetch

### 3. GDPR Compliance Check

#### Data Minimization
- [ ] Only necessary personal data collected
- [ ] Purpose documented for each data field
- [ ] Retention period defined

#### User Rights
- [ ] Account deletion deletes all user data (cascade)
- [ ] User can export their data
- [ ] Consent recorded for data processing

#### Data Storage
- [ ] Supabase project in EU region
- [ ] No PII transferred outside EU
- [ ] Encryption at rest (Supabase default)

#### Phase 2 Specific (BankID)
- [ ] Swedish personal numbers (personnummer) encrypted at rest
- [ ] Minimal retention of ID verification data
- [ ] BankID integration uses official SDK

### 4. Supabase RLS Audit

For each table, verify:

```
Table: [name]
RLS Enabled: Yes/No
SELECT policy: [description] — Correct/Missing/Overly permissive
INSERT policy: [description] — Correct/Missing/Overly permissive
UPDATE policy: [description] — Correct/Missing/Overly permissive
DELETE policy: [description] — Correct/Missing/Overly permissive
```

### 5. Generate Report

Output format:

```
## Security Review: [feature/scope]

### Risk Level: [LOW / MEDIUM / HIGH / CRITICAL]

### Findings

| # | Severity | Category | Description | Recommendation |
|---|----------|----------|-------------|----------------|
| 1 | Critical | A01 | Missing RLS on table X | Add SELECT/INSERT policies |
| 2 | High | A03 | Unvalidated input in ... | Add zod schema |

### RLS Status
[Table-by-table status]

### GDPR Notes
[Any privacy concerns]

### Action Items
[Numbered list for @coder]
```
