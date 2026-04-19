# Phase 2 Weekly Digest UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the weekly digest UI — a banner on the dashboard home and a full `/dashboard/digest` page, both reading from the existing `/api/digest` endpoint.

**Architecture:** Three isolated changes: (1) add Digest nav item to sidebar, (2) create standalone digest page, (3) insert digest banner card into dashboard home. No new API routes or DB migrations needed — the `/api/digest` endpoint is already complete.

**Tech Stack:** Next.js 13 App Router, React, shadcn/ui (Card, Badge, Button, Skeleton), lucide-react, date-fns, `@/lib/api-client`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `components/dashboard/sidebar.tsx` | Add Digest nav item |
| Create | `app/dashboard/digest/page.tsx` | Full weekly digest page |
| Modify | `app/dashboard/page.tsx` | Add digest banner card |

---

## Task 1: Add Digest nav item to sidebar

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

The sidebar uses a `navItems` array. Add a `Newspaper` icon import and a new nav entry between Analytics and Events.

- [ ] **Step 1: Add Newspaper to imports and insert nav item**

In `components/dashboard/sidebar.tsx`, update the import line and navItems array:

```tsx
// Change this import line:
import { LayoutDashboard, Star, FileText, TrendingUp, CreditCard as Edit3, Calendar, Settings, LogOut, ChartBar as BarChart3, Users } from 'lucide-react';

// To this (add Newspaper):
import { LayoutDashboard, Star, FileText, TrendingUp, CreditCard as Edit3, Calendar, Settings, LogOut, ChartBar as BarChart3, Users, Newspaper } from 'lucide-react';
```

Then in the `navItems` array, insert after the Analytics entry:

```tsx
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Digest',
    href: '/dashboard/digest',
    icon: Newspaper,
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
  },
```

- [ ] **Step 2: Verify the file compiles (no TypeScript errors)**

```bash
npx tsc --noEmit 2>&1 | grep sidebar
```

Expected: no output (no errors in sidebar.tsx).

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat: add Digest nav item to sidebar"
```

---

## Task 2: Create the full digest page

**Files:**
- Create: `app/dashboard/digest/page.tsx`

This page fetches `/api/digest?businessId=<id>` — it first calls `/api/gmb/check-status` to get the businessId, then fetches the digest. Displays 4 stat cards, highlights, top action, and posts this week.

- [ ] **Step 1: Create the file with full implementation**

Create `app/dashboard/digest/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Star, Eye, MessageSquare,
  TrendingUp, TrendingDown, Minus, ArrowRight, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';

interface DigestData {
  businessName: string;
  weekOf: string;
  posts: { count: number; items: { id: string; title: string; published_at: string }[] };
  reviews: { received: number; replied: number; avgRating: number };
  views: { thisWeek: number; priorWeek: number; trend: number };
  highlights: string[];
  topAction: string;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return (
    <Badge className="bg-green-100 text-green-700 border-0 text-xs font-semibold">
      <TrendingUp className="h-3 w-3 mr-1" />+{trend}%
    </Badge>
  );
  if (trend < 0) return (
    <Badge className="bg-red-100 text-red-700 border-0 text-xs font-semibold">
      <TrendingDown className="h-3 w-3 mr-1" />{trend}%
    </Badge>
  );
  return (
    <Badge className="bg-gray-100 text-gray-500 border-0 text-xs font-semibold">
      <Minus className="h-3 w-3 mr-1" />0%
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
}) {
  return (
    <Card className="bg-white border-gray-200">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-lg bg-gray-50">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
          {trend !== undefined && <TrendBadge trend={trend} />}
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DigestPage() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await api.get<any>('/api/gmb/check-status');
        const biz = status.businesses?.[0];
        if (!biz) { setNoData(true); setLoading(false); return; }
        const data = await api.get<DigestData>(`/api/digest?businessId=${biz.id}`);
        setDigest(data);
      } catch {
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (noData || !digest) {
    return (
      <div className="p-6">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No digest available. Connect your Google Business Profile first.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const weekStart = parseISO(digest.weekOf);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Digest</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')} · {digest.businessName}
          </p>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Posts Published" value={digest.posts.count} />
          <StatCard icon={MessageSquare} label="Reviews Replied" value={digest.reviews.replied} />
          <StatCard
            icon={Star}
            label="New Reviews"
            value={digest.reviews.received}
            sub={digest.reviews.received > 0 ? `avg ${digest.reviews.avgRating.toFixed(1)}★` : undefined}
          />
          <StatCard
            icon={Eye}
            label="Profile Views"
            value={digest.views.thisWeek.toLocaleString()}
            trend={digest.views.trend}
          />
        </div>

        {/* Highlights */}
        {digest.highlights.length > 0 && (
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">This Week's Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {digest.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#6931FF] flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Top action */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-blue-700 mb-1">What to do next</p>
          <p className="text-sm text-blue-600">{digest.topAction}</p>
        </div>

        {/* Posts this week */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Posts Published This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {digest.posts.items.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">No posts published this week.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/posts">
                    Create a Post <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {digest.posts.items.map(post => (
                  <li key={post.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <FileText className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{post.title}</span>
                    {post.published_at && (
                      <span className="text-xs text-gray-400">
                        {format(parseISO(post.published_at), 'MMM d')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "digest|Digest"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/digest/page.tsx
git commit -m "feat: add weekly digest full page at /dashboard/digest"
```

---

## Task 3: Add digest banner to dashboard home

**Files:**
- Modify: `app/dashboard/page.tsx`

Add a digest banner card that loads in parallel with existing data and renders just below the location bar / above the stat cards. It shows week range, highlights, top action, and a "View full digest →" link.

- [ ] **Step 1: Add DigestData type and digest state**

In `app/dashboard/page.tsx`, add after the existing `DashboardPayload` interface:

```tsx
interface DigestData {
  businessName: string;
  weekOf: string;
  posts: { count: number; items: { id: string; title: string; published_at: string }[] };
  reviews: { received: number; replied: number; avgRating: number };
  views: { thisWeek: number; priorWeek: number; trend: number };
  highlights: string[];
  topAction: string;
}
```

Add state for digest inside `DashboardPage()` near the other `useState` calls:

```tsx
const [digest, setDigest] = useState<DigestData | null>(null);
```

- [ ] **Step 2: Add parseISO import from date-fns**

The existing import of `date-fns` already includes `format` and `formatDistanceToNowStrict`. Add `parseISO`:

```tsx
// Change:
import { format, formatDistanceToNowStrict } from 'date-fns';
// To:
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
```

- [ ] **Step 3: Fetch digest in parallel inside fetchData()**

In the `fetchData` function, after `setBusinessId(bid)` and before the dashboard fetch, add a non-blocking digest fetch:

```tsx
// After: setBusinessId(bid);
// Add these lines before the dashboard fetch:

// Fetch digest in background (non-blocking)
api.get<DigestData>(`/api/digest?businessId=${bid}`)
  .then(d => setDigest(d))
  .catch(() => {/* digest is non-critical */});
```

- [ ] **Step 4: Add Newspaper to lucide imports**

Find the lucide-react import line:

```tsx
import { Phone, Navigation, Globe, CalendarDays, Eye, MousePointerClick, Star, MessageSquare, RefreshCw, Loader as Loader2, CircleAlert as AlertCircle, ChevronDown, Copy, MapPin, Tag, Clock, Code as Code2, Settings } from 'lucide-react';
```

Add `Newspaper, ArrowRight` to it:

```tsx
import { Phone, Navigation, Globe, CalendarDays, Eye, MousePointerClick, Star, MessageSquare, RefreshCw, Loader as Loader2, CircleAlert as AlertCircle, ChevronDown, Copy, MapPin, Tag, Clock, Code as Code2, Settings, Newspaper, ArrowRight } from 'lucide-react';
```

- [ ] **Step 5: Add Link import**

Add `Link` import from `next/link` if not already imported:

```tsx
import Link from 'next/link';
```

- [ ] **Step 6: Insert the digest banner in JSX**

In the JSX return block, find the location selector bar (the `div` containing `MapPin` icon and `business?.name`). Insert the digest banner **after** the location bar and **before** the Top Stats Row comment. The inserted JSX:

```tsx
        {/* Weekly Digest Banner */}
        {digest && (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 mb-2">
                  <Newspaper className="h-4 w-4 text-[#6931FF]" />
                  <span className="text-sm font-semibold text-gray-900">This Week's Autopilot Report</span>
                  <span className="text-xs text-gray-400">
                    {(() => {
                      const s = parseISO(digest.weekOf);
                      const e = new Date(s); e.setDate(e.getDate() + 6);
                      return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
                    })()}
                  </span>
                </div>
                <Link href="/dashboard/digest" className="text-xs font-semibold text-[#6931FF] hover:underline flex items-center gap-1 flex-shrink-0">
                  View full digest <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {digest.highlights.length > 0 && (
                <p className="text-sm text-gray-600 mb-3">
                  {digest.highlights.join(' · ')}
                </p>
              )}
              {digest.topAction && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">What to do next</p>
                  <p className="text-xs text-blue-600">{digest.topAction}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
```

You also need to import `Card` and `CardContent` — check if they're already imported in dashboard/page.tsx. If not, add:

```tsx
import { Card, CardContent } from '@/components/ui/card';
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "dashboard/page"
```

Expected: no output.

- [ ] **Step 8: Commit all outstanding Phase 2 work**

```bash
git add \
  app/dashboard/page.tsx \
  app/api/profile/audit/route.ts \
  app/api/digest/route.ts \
  app/dashboard/profile/page.tsx \
  lib/gmb-client.ts \
  app/api/ai/generate-post/route.ts \
  lib/keyword-library.ts

git commit -m "$(cat <<'EOF'
feat: complete Phase 2 — profile audit UI, weekly digest banner + page

- Profile completeness audit: API + score ring UI in Profile page
- Weekly digest: full page at /dashboard/digest with stat cards,
  highlights, top action, and posts list
- Digest banner on dashboard home (non-blocking parallel fetch)
- Digest nav item in sidebar
- Keyword injection in AI post generation (keyword-library + prompt)
- GMB Q&A types added to gmb-client

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Dashboard banner with week range, highlights, top action, "View full digest" link
- ✅ Full page with 4 stat cards (Posts, Reviews Replied, New Reviews, Profile Views + trend)
- ✅ Highlights list
- ✅ Top action callout
- ✅ Posts this week list + empty state
- ✅ Sidebar nav item "Digest" with Newspaper icon between Analytics and Events

**Placeholder scan:** None found — all steps have full code.

**Type consistency:** `DigestData` defined once and reused in both Task 2 (digest page) and Task 3 (dashboard banner). API field names match the `/api/digest` route response shape.
