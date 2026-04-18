# GMB Insights Sync — Design Spec

**Date:** 2026-04-19
**Status:** Approved
**Phase:** 2 — Owner Dashboard (step 1 of 4)
**Goal:** Pull Google Business Profile performance metrics (views, clicks, calls, directions) from the Google Business Profile Performance API, store daily snapshots in Supabase, and display them on an analytics dashboard with trend comparisons.

---

## Background

`getLocationInsights()` is already fully implemented in `lib/gmb-client.ts`. It calls Google's Business Profile Performance API v1 and returns `profileViews`, `phoneCalls`, `websiteClicks`, `directionRequests`, and a daily breakdown array. No new Google credentials or OAuth scopes are required — the existing connected Google account already has access.

**Google data lag:** The Performance API data is ~2 days behind. This is a Google limitation. The UI must always display "Data as of [last sync date]" to avoid confusion.

---

## Data Layer

### New table: `business_insights`

```sql
CREATE TABLE business_insights (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date                date NOT NULL,
  profile_views       integer NOT NULL DEFAULT 0,
  phone_calls         integer NOT NULL DEFAULT 0,
  website_clicks      integer NOT NULL DEFAULT 0,
  direction_requests  integer NOT NULL DEFAULT 0,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, date)
);
```

- One row per business per day
- `UNIQUE (business_id, date)` enables upsert — re-syncing the same period never creates duplicates
- RLS: scoped via `business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())`
- Indexes: `business_id`, `(business_id, date DESC)` for fast range queries

### Sync strategy

| Sync type | Date range | When |
|-----------|-----------|------|
| First sync (no existing rows) | Last 90 days | On first "Sync Now" or cron run |
| Incremental sync | Last 8 days | Every subsequent sync (covers Google's 2-day lag + buffer) |

Detection: if `COUNT(*) FROM business_insights WHERE business_id = X` is 0 → first sync, else incremental.

---

## API Routes

### `POST /api/gmb/sync-insights`

**Auth:** `getAuthenticatedUserId` required.

**Logic:**
1. Get all businesses for `userId`
2. For each business:
   a. Detect first vs incremental sync
   b. Call `getLocationInsights(accessToken, locationId, startDate, endDate)`
   c. Upsert each day's row into `business_insights`
3. Record sync in `gmb_sync_sessions` with `sync_type: 'insights'`
4. Enforce 24hr cooldown using existing `canSync()` pattern from `app/api/cron/sync-data/route.ts`

**Response:**
```typescript
{ synced: number, lastSyncedAt: string }
// or on cooldown:
{ error: 'Sync cooldown active', nextSyncAt: string }
```

**Error handling:** If Google API returns an error (quota, token expired), log it and return a user-friendly message. Never throw unhandled — always return `{ error: string }`.

---

### `GET /api/analytics`

**Auth:** `getAuthenticatedUserId` required.

**Query params:**
- `businessId` (required)
- `days` (optional, default: 28, max: 90)

**Logic:**
1. Verify business ownership
2. Fetch rows from `business_insights` for `businessId` in the last `days` days
3. Fetch rows for the prior same-length period (for trend calculation)
4. Compute totals + trend deltas
5. Fetch last sync time from `gmb_sync_sessions`

**Response:**
```typescript
{
  insights: Array<{
    date: string;
    profile_views: number;
    phone_calls: number;
    website_clicks: number;
    direction_requests: number;
  }>;
  totals: {
    profileViews: number;
    phoneCalls: number;
    websiteClicks: number;
    directionRequests: number;
    clickRate: number; // (actions / views) * 100
  };
  trends: {
    profileViews: number;    // % change vs prior period
    phoneCalls: number;
    websiteClicks: number;
    directionRequests: number;
  };
  lastSyncedAt: string | null;
  canSync: boolean; // false if within 24hr cooldown
}
```

No live GMB calls — reads only from DB, always fast.

---

### `app/api/cron/sync-data/route.ts` — extend existing

Add insights sync to the existing cron handler after reviews sync:
```typescript
// After syncBusinessReviews(...)
await syncInsightsForUser(userId); // new helper, same pattern
```

---

## UI: `app/dashboard/analytics/page.tsx`

Replaces the existing blank placeholder.

### Components

**Header row:**
- Title: "Analytics"
- "Last synced: X days ago" label (gray text, updates after sync)
- "Sync Now" button — disabled during sync + within 24hr cooldown, shows spinner

**Period selector tabs:** 7 days / 28 days / 90 days — updates all charts and stat cards

**4 stat cards:**
| Card | Value | Trend |
|------|-------|-------|
| Profile Views | Total for period | ↑/↓ % vs prior period |
| Phone Calls | Total for period | ↑/↓ % vs prior period |
| Website Clicks | Total for period | ↑/↓ % vs prior period |
| Direction Requests | Total for period | ↑/↓ % vs prior period |

Trend colors: green for positive, red for negative, gray for 0%.

**Line chart:** Daily profile views over selected period using `recharts` (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`). X-axis: dates. Y-axis: view count.

**Bar chart:** Weekly totals for phone calls, website clicks, direction requests side-by-side using `recharts` `BarChart`.

**Empty state** (no data synced yet):
```
[chart icon]
No analytics data yet
Connect your Google account and sync to see your GMB performance
[Sync Now button]
```

### Data flow
1. Page loads → `api.get('/api/analytics?businessId=X&days=28')` — reads from DB instantly
2. Period tab change → re-fetch with new `days` param
3. "Sync Now" click → POST `/api/gmb/sync-insights` → on completion, re-fetch analytics
4. `canSync: false` in response → disable Sync Now button, show "Next sync available in Xh"

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/<ts>_add_business_insights.sql` | Create |
| `app/api/gmb/sync-insights/route.ts` | Create |
| `app/api/analytics/route.ts` | Create |
| `app/dashboard/analytics/page.tsx` | Rewrite (blank → full implementation) |
| `app/api/cron/sync-data/route.ts` | Modify (add insights sync call) |

---

## Success Criteria

- Syncing pulls 90 days of data on first run, 8 days on subsequent runs
- Dashboard shows stat cards with trend arrows within 1s of page load (reads from DB)
- "Sync Now" correctly enforces 24hr cooldown
- Upsert logic means re-syncing the same period never duplicates rows
- All data labeled with last sync date — no user confusion about the 2-day Google lag
- Empty state shown clearly when no sync has run
