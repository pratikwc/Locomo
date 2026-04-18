# Locomo / Growmatiq — Project Context

## Product Vision

Zero-human-effort GMB autopilot for local businesses. The goal: rank businesses on Google Maps by automating every action Google rewards.

Google's local ranking has 3 pillars:
- **Relevance** — profile matches search intent (category, description, keywords, posts, Q&A)
- **Prominence** — trust signals (review count, recency, reply rate, post frequency)
- **Distance** — accurate address + service area (we can't change this, so we dominate the other two)

### Weekly Autopilot Cycle
```
MON  Analyze last week — reviews, post performance, keyword movement
TUE  Generate 2 posts (Standard + Offer/Event) with images
WED  Publish Post #1 to GMB
THU  Reply to unanswered reviews (1-2★ flag for owner, 3★ acknowledge, 4-5★ warm thanks + keyword)
FRI  Publish Post #2
SAT  Profile health check (hours, photos, description keywords)
SUN  Weekly digest to owner
```

### Roadmap
- **Phase 1 (done):** AI post generation, auto review reply, AI recommendations
- **Phase 2 (next):** GMB Insights sync, profile completeness audit, keyword library by category
- **Phase 3:** Full autopilot — posting scheduler, Q&A automation, smart keyword injection
- **Phase 4:** Owner intelligence — weekly digest, competitor alerts, opportunity detection

---

## Tech Stack

- **Framework:** Next.js 13 App Router — pages in `app/`, API routes in `app/api/`
- **Database:** Supabase PostgreSQL + Storage (bucket: `post-images`)
- **Auth:** Custom JWT — phone OTP. **NOT Supabase Auth.**
- **Google:** OAuth + Google My Business API v4
- **AI text:** OpenAI `gpt-4o-mini` via `lib/openai.ts`
- **AI images:** Gemini `gemini-2.0-flash-preview-image-generation` via `app/api/ai/generate-image/route.ts`

---

## Auth Pattern (critical — never deviate)

```typescript
// Always at the top of every API route handler:
const userId = await getAuthenticatedUserId(request);
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

- Import from: `@/lib/auth-utils`
- **Never use** `supabase.auth.*` — it is not wired up in this project
- All DB queries must scope to `user_id` to enforce ownership

---

## Database Conventions

- Use `supabaseAdmin` from `@/lib/supabase-admin` in all API routes (never the browser client)
- Key tables: `businesses`, `posts`, `reviews`, `google_accounts`, `workspaces`, `locations`
- Every `businesses` row has `user_id` — always filter `.eq('user_id', userId)`
- Business ownership check before any data access:
  ```typescript
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  ```
- Use `.maybeSingle()` not `.single()` (avoids throws on missing rows)
- Migration files: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Every new table needs RLS enabled + policies scoped to `user_id`

---

## GMB API Patterns

- Token refresh: `getValidAccessToken(userId)` from `@/lib/google-token-manager`
- All GMB calls go through `lib/gmb-client.ts` — never call GMB API directly
- Location path construction (`business.business_id` may be `locations/123` or full path):
  ```typescript
  let locationPath: string;
  if (business.business_id.startsWith('accounts/')) {
    locationPath = business.business_id;
  } else {
    const accountId = googleAccount.gmb_account_name.replace('accounts/', '');
    const locationId = business.business_id.replace('locations/', '');
    locationPath = `accounts/${accountId}/locations/${locationId}`;
  }
  ```
- Posts with images: pass `mediaUrl` to `createLocalPost()` — it adds `media: [{ mediaFormat: 'PHOTO', sourceUrl }]`

---

## API Route Conventions

Standard handler structure:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ... business ownership check if needed ...
    // ... fetch data ...

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[Route Name] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
```

- Error shape: always `{ error: string }` with correct HTTP status
- Log errors: `console.error('[Route Name] Error:', error)`

---

## UI Conventions

- Data fetching: `api.get()`, `api.post()`, `api.delete()` from `@/lib/api-client`
- **Sheet** (`@/components/ui/sheet`) — side-panel for create/edit composers
- **AlertDialog** — required for all destructive actions (delete, disconnect)
- **useToast** from `@/hooks/use-toast` — all success/error feedback
- **Card + CardContent** — list items
- Loading state: `<Loader2 className="h-8 w-8 animate-spin text-gray-400" />`
- Empty state: dashed border card with icon, description, and CTA button
- shadcn/ui components only — no raw HTML inputs/buttons in pages
- Character counter pattern for text areas: `{charCount}/{charLimit}` bottom-right

---

## Project Skills

Use these slash commands when building features:

| Command | When to use |
|---------|-------------|
| `/locomo-feature <name>` | Building a new end-to-end GMB-connected feature |
| `/locomo-db <table-name>` | Need a new Supabase table with RLS |
| `/locomo-api <route-path>` | Need a new API route |
