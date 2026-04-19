# Phase 2 — Weekly Digest Design

**Date:** 2026-04-19  
**Status:** Approved  
**Phase:** 2 — Owner Dashboard (step 4 of 4)

---

## Overview

The weekly digest surfaces what the autopilot did this week so the owner stays informed without doing any work. It appears in two places: a compact banner on the dashboard home and a full standalone page reachable from the banner and the sidebar nav.

Data source: existing `/api/digest` endpoint (already written). No new API work needed.

---

## API Response Shape

```ts
{
  businessName: string;
  weekOf: string;                  // ISO date — start of the week
  posts: { count: number; items: { id, title, published_at }[] };
  reviews: { received: number; replied: number; avgRating: number };
  views: { thisWeek: number; priorWeek: number; trend: number }; // trend = % change
  highlights: string[];            // ["2 posts published", "5 reviews replied", ...]
  topAction: string;               // "No posts this week — publish an update..."
}
```

---

## Feature 1 — Dashboard Home Banner

**Location:** `app/dashboard/page.tsx` — inserted as a card near the top of the existing layout, above the stat cards.

**Content:**
- Heading: "This Week's Autopilot Report" + date range (e.g. "Apr 12 – Apr 19")
- Highlight pills: comma-separated highlights from the API (e.g. "2 posts published · 5 reviews replied · 1,240 views")
- Top action callout in a blue info box (matching the profile audit card style)
- "View full digest →" link to `/dashboard/digest`

**Behaviour:**
- Fetches `/api/digest?businessId=<id>` on page load in parallel with existing data
- Shows a skeleton while loading (single card, 2 rows high)
- Hidden entirely if the business is not connected to Google (no businessId available)

---

## Feature 2 — Full Digest Page

**Route:** `app/dashboard/digest/page.tsx`

**Layout (top to bottom):**

1. **Header** — "Weekly Digest" title + subtitle "Week of [formatted date]"

2. **4 stat cards** (grid, 2 cols on mobile / 4 on desktop):
   - Posts Published — count
   - Reviews Replied — replied count
   - New Reviews — received count (with avg rating if > 0)
   - Profile Views — thisWeek count + trend badge (↑12% or ↓5% vs last week, green/red)

3. **Highlights list** — bullet list of the `highlights` array strings from the API

4. **Top action callout** — blue card matching profile audit style: "What to do next" heading + topAction string

5. **Posts this week** — list of post titles from `posts.items`; shown only if count > 0; empty state "No posts published this week" if count === 0

**Loading state:** `Loader2` spinner centred, matching all other dashboard pages.

**Empty state:** If no business connected, dashed border card with message + "Go to Dashboard" button.

---

## Feature 3 — Sidebar Nav Item

**File:** `components/dashboard/sidebar.tsx`

Add a "Digest" nav item with the `Newspaper` icon from lucide-react, positioned between Analytics and Events:

```
Dashboard
Reviews
Posts
Keywords
Profile Editor
Analytics
→ Digest        ← new
Events
```

---

## Scope

- No new database tables or migrations needed
- No new API routes needed — `/api/digest` is complete
- UI only: 1 new page + 1 card on dashboard home + 1 sidebar item

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `app/dashboard/digest/page.tsx` |
| Modify | `app/dashboard/page.tsx` — add digest banner card |
| Modify | `components/dashboard/sidebar.tsx` — add Digest nav item |

---

## Commit Strategy

After digest UI is complete, commit all outstanding Phase 2 work in one commit:
- `app/api/profile/audit/route.ts`
- `app/api/digest/route.ts`
- `app/dashboard/profile/page.tsx` (audit UI wired in)
- `app/dashboard/digest/page.tsx`
- `components/dashboard/sidebar.tsx`
- `app/dashboard/page.tsx`
- `lib/gmb-client.ts` (Q&A types added)
- `app/api/ai/generate-post/route.ts` (keyword injection)
- `lib/keyword-library.ts`
