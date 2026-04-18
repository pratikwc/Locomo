# Locomo Developer Experience Setup — Design Spec

**Date:** 2026-04-19  
**Status:** Approved  
**Goal:** Eliminate repetition, quality drift, and speed friction when building features in the Locomo/Growmatiq repo.

---

## Problem

Every Claude Code session requires re-explaining the same project context:
- Custom JWT auth pattern (phone OTP, not Supabase Auth)
- Supabase schema, RLS conventions, migration patterns
- GMB API token lifecycle, location path construction
- UI patterns (App Router, Sheet composers, api-client.ts fetch)

This causes repetition, quality drift (missing RLS, wrong auth, inconsistent error shapes), and slow feature delivery.

---

## Solution: Option B — CLAUDE.md + Project Skills

### 1. CLAUDE.md (repo root)

Auto-loaded by Claude Code at the start of every session. Covers:

**Product Vision**
- Locomo / Growmatiq: zero-human-effort GMB autopilot for local businesses
- Goal: rank businesses on Google Maps via Relevance, Prominence, Distance pillars
- Weekly autopilot cycle: analyze → generate → post → reply to reviews → profile audit → weekly digest
- Phase 1 (done): AI post generation, auto review reply, AI recommendations
- Phase 2 (next): GMB Insights sync, profile completeness audit, keyword library by category
- Phase 3: Full autopilot engine — posting scheduler, Q&A automation, smart keyword injection
- Phase 4: Owner intelligence — weekly digest, competitor alerts, opportunity detection

**Tech Stack**
- Next.js 13 App Router (server + client components, API routes in `app/api/`)
- Supabase PostgreSQL + Storage (bucket: `post-images`)
- Custom JWT auth — phone OTP, NOT Supabase Auth
- Google OAuth + Google My Business API v4
- OpenAI `gpt-4o-mini` for text generation
- Gemini `gemini-2.0-flash-preview-image-generation` for image generation

**Auth Pattern (critical)**
- Always use `getAuthenticatedUserId(request)` from `lib/auth-utils.ts`
- Never use `supabase.auth.*` — it is not wired up
- All DB queries in API routes must scope to `user_id` for security

**Database Conventions**
- Use `supabaseAdmin` (from `lib/supabase-admin.ts`) in all API routes
- Key tables: `businesses`, `posts`, `reviews`, `google_accounts`, `workspaces`, `locations`
- Every business row has `user_id` — always filter by it to enforce ownership
- Migration files: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- RLS: every new table needs a policy scoping SELECT/INSERT/UPDATE/DELETE to `auth.uid()` or `user_id`

**GMB API Patterns**
- Token refresh: always use `getValidAccessToken(userId)` from `lib/google-token-manager.ts`
- GMB client: all GMB API calls go through `lib/gmb-client.ts`
- Location path: `accounts/{accountId}/locations/{locationId}` — `business.business_id` may be `locations/123` or full path, handle both
- Posts: `createLocalPost()` in gmb-client; include `media` array for image posts
- Reviews: `listReviews()`, `replyToReview()` in gmb-client

**API Route Conventions**
- Every route: auth check first → business ownership verify → action → return `NextResponse.json()`
- Error shape: `{ error: string }` with appropriate HTTP status
- Use `maybeSingle()` not `single()` to avoid throws on missing rows
- Business ownership check: `.eq('id', businessId).eq('user_id', userId)`

**UI Conventions**
- Data fetching: client-side via `lib/api-client.ts` (`api.get`, `api.post`, `api.delete`)
- Sheet component for side-panel composers (create/edit flows)
- AlertDialog for all destructive confirmations
- `useToast()` for all success/error feedback
- Card + CardContent for list items
- Loader2 spinner while loading, empty state with dashed border when no data
- shadcn/ui components only — no raw HTML form elements

**Available Project Skills**
- `/locomo-feature <name>` — scaffold a complete GMB-connected feature end-to-end
- `/locomo-db <table-name>` — generate a Supabase migration with RLS + indexes
- `/locomo-api <route-path>` — scaffold an API route with auth + ownership check

---

### 2. Project Skills (`.claude/commands/`)

#### `/locomo-feature <name>`

Guides Claude to implement a complete feature following Locomo patterns:

1. Identify if a new DB table is needed → run `/locomo-db` first if so
2. Create `app/api/<path>/route.ts` using `/locomo-api` pattern
3. Create or update `app/dashboard/<name>/page.tsx`:
   - Client component with `useState` + `useEffect` + `useCallback`
   - Fetch via `api.get()` on mount
   - Sheet for create/edit composer
   - AlertDialog for delete
   - PostCard-style cards for list items
   - Stats summary row at top
   - `useToast` for all feedback
4. Wire any GMB API calls through `lib/gmb-client.ts`
5. Use `getValidAccessToken(userId)` for any Google API calls
6. Confirm TypeScript compiles: `npx tsc --noEmit`

#### `/locomo-db <table-name>`

Generates a migration file:

1. Filename: `supabase/migrations/$(date +%Y%m%d%H%M%S)_add_<table-name>.sql`
2. Table with: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
3. RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY` + policies for SELECT/INSERT/UPDATE/DELETE scoped to `auth.uid() = user_id`
4. Indexes: on `user_id`, on any foreign keys, on commonly filtered columns
5. Print the TypeScript interface matching the table shape

#### `/locomo-api <route-path>`

Scaffolds `app/api/<route-path>/route.ts`:

1. Imports: `NextRequest`, `NextResponse`, `supabaseAdmin`, `getAuthenticatedUserId`
2. Auth check at the top of every handler
3. Business ownership verification before any data access
4. GET: fetch with `.select('*').eq('business_id', businessId).order('created_at', { ascending: false })`
5. POST: insert with ownership-verified `business_id`, return inserted row
6. DELETE: delete scoped to user's business IDs
7. All errors: `{ error: string }` + appropriate status code
8. `console.error('[Route Name] Error:', error)` in catch blocks

---

## File Structure

```
/Locomo/
├── CLAUDE.md
└── .claude/
    ├── settings.local.json
    └── commands/
        ├── locomo-feature.md
        ├── locomo-db.md
        └── locomo-api.md
```

---

## Success Criteria

- New session: Claude immediately knows auth pattern, schema, GMB conventions without being told
- `/locomo-feature` produces a working implementation in one pass, no missing RLS or wrong auth
- `/locomo-db` produces a migration file ready to apply with no edits needed
- `/locomo-api` produces an API route that matches existing routes in structure and security
