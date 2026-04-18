# Locomo DX Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create CLAUDE.md + three project skills that eliminate repetition, quality drift, and slow feature delivery in the Locomo repo.

**Architecture:** A `CLAUDE.md` at the repo root is auto-loaded by Claude Code every session, encoding product vision, tech stack, auth patterns, DB conventions, and UI rules. Three slash-command skills in `.claude/commands/` give Claude a step-by-step recipe for the three most common build operations: scaffolding a full feature, generating a DB migration, and creating an API route.

**Tech Stack:** Markdown (CLAUDE.md + skill files), Claude Code slash commands (`.claude/commands/*.md`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `CLAUDE.md` | Create | Project knowledge loaded every session |
| `.claude/commands/locomo-feature.md` | Create | `/locomo-feature` skill — full feature scaffold |
| `.claude/commands/locomo-db.md` | Create | `/locomo-db` skill — migration file generator |
| `.claude/commands/locomo-api.md` | Create | `/locomo-api` skill — API route scaffold |

---

## Task 1: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md at repo root**

Create `/home/pratik/Business/Locomo/CLAUDE.md` with the following exact content:

```markdown
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
```

- [ ] **Step 2: Verify CLAUDE.md is at repo root**

```bash
ls /home/pratik/Business/Locomo/CLAUDE.md
```
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md with full project context for Claude Code sessions"
```

---

## Task 2: Create `/locomo-api` skill

**Files:**
- Create: `.claude/commands/locomo-api.md`

- [ ] **Step 1: Create the commands directory**

```bash
mkdir -p /home/pratik/Business/Locomo/.claude/commands
```

- [ ] **Step 2: Create locomo-api.md**

Create `/home/pratik/Business/Locomo/.claude/commands/locomo-api.md` with this exact content:

```markdown
Create a new API route at `app/api/$ARGUMENTS/route.ts` following Locomo conventions.

## Steps

1. Create the file `app/api/$ARGUMENTS/route.ts` with this exact structure:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    // Verify business ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('TABLE_NAME')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error: any) {
    console.error('[$ARGUMENTS GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { businessId, ...fields } = body;
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    // Verify business ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from('TABLE_NAME')
      .insert({ business_id: businessId, ...fields })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ item: data });
  } catch (error: any) {
    console.error('[$ARGUMENTS POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Scope delete to user's businesses
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', userId);
    const businessIds = businesses?.map(b => b.id) ?? [];

    const { error } = await supabaseAdmin
      .from('TABLE_NAME')
      .delete()
      .eq('id', id)
      .in('business_id', businessIds);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[$ARGUMENTS DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
```

2. Replace `TABLE_NAME` with the actual Supabase table name for this route.

3. Remove any handlers (GET/POST/DELETE) that this route doesn't need.

4. Run TypeScript check:
```bash
npx tsc --noEmit
```
Fix any errors before proceeding.

5. Commit:
```bash
git add app/api/$ARGUMENTS/route.ts
git commit -m "feat: add $ARGUMENTS API route"
```
```

- [ ] **Step 3: Verify file exists**

```bash
ls /home/pratik/Business/Locomo/.claude/commands/locomo-api.md
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/locomo-api.md
git commit -m "feat: add /locomo-api project skill"
```

---

## Task 3: Create `/locomo-db` skill

**Files:**
- Create: `.claude/commands/locomo-db.md`

- [ ] **Step 1: Create locomo-db.md**

Create `/home/pratik/Business/Locomo/.claude/commands/locomo-db.md` with this exact content:

```markdown
Generate a Supabase migration file for a new table called `$ARGUMENTS`.

## Steps

1. Generate the migration filename using the current timestamp:
```bash
date +%Y%m%d%H%M%S
```

2. Create `supabase/migrations/<timestamp>_add_$ARGUMENTS.sql` with this structure:

```sql
-- Create $ARGUMENTS table
CREATE TABLE IF NOT EXISTS $ARGUMENTS (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- ADD YOUR COLUMNS HERE
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE $ARGUMENTS ENABLE ROW LEVEL SECURITY;

-- RLS Policies (scoped via business ownership)
CREATE POLICY "$ARGUMENTS_select" ON $ARGUMENTS
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_insert" ON $ARGUMENTS
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_update" ON $ARGUMENTS
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_delete" ON $ARGUMENTS
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS $ARGUMENTS_business_id_idx ON $ARGUMENTS (business_id);
CREATE INDEX IF NOT EXISTS $ARGUMENTS_created_at_idx ON $ARGUMENTS (created_at DESC);
```

3. Replace the `-- ADD YOUR COLUMNS HERE` comment with the actual columns needed for this feature.

4. Add any additional indexes for columns that will be filtered or sorted frequently.

5. Print the TypeScript interface for this table so it can be added to the page/component:

```typescript
interface $ARGUMENTS_PascalCase {
  id: string;
  business_id: string;
  // mirror your columns here
  created_at: string;
  updated_at: string;
}
```

6. Apply the migration via Supabase MCP:
   - Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL content
   - Or run: `supabase db push` if CLI is available

7. Commit:
```bash
git add supabase/migrations/
git commit -m "feat: add $ARGUMENTS table migration"
```
```

- [ ] **Step 2: Verify file exists**

```bash
ls /home/pratik/Business/Locomo/.claude/commands/locomo-db.md
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/locomo-db.md
git commit -m "feat: add /locomo-db project skill"
```

---

## Task 4: Create `/locomo-feature` skill

**Files:**
- Create: `.claude/commands/locomo-feature.md`

- [ ] **Step 1: Create locomo-feature.md**

Create `/home/pratik/Business/Locomo/.claude/commands/locomo-feature.md` with this exact content:

```markdown
Build a complete GMB-connected feature called `$ARGUMENTS` following Locomo patterns end-to-end.

## Steps

### Step 1 — Database (if new table needed)

If this feature requires a new table, run `/locomo-db <table-name>` first and wait for it to complete before continuing.

If using an existing table, skip to Step 2.

### Step 2 — API Route

Run `/locomo-api gmb/$ARGUMENTS` to scaffold the route, then customise:

- Replace `TABLE_NAME` with the actual table
- Add any GMB API calls using `lib/gmb-client.ts`:
  - Import `getValidAccessToken` from `@/lib/google-token-manager`
  - Call `getValidAccessToken(userId)` before any GMB API call
  - Build location path:
    ```typescript
    let locationPath: string;
    if (business.business_id.startsWith('accounts/')) {
      locationPath = business.business_id;
    } else {
      const { data: googleAccount } = await supabaseAdmin
        .from('google_accounts')
        .select('gmb_account_name')
        .eq('id', business.google_account_id)
        .maybeSingle();
      const accountId = googleAccount!.gmb_account_name.replace('accounts/', '');
      const locationId = business.business_id.replace('locations/', '');
      locationPath = `accounts/${accountId}/locations/${locationId}`;
    }
    ```

### Step 3 — Dashboard Page

Create `app/dashboard/$ARGUMENTS/page.tsx` with this structure:

```typescript
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';

interface Item {
  id: string;
  business_id: string;
  // add your fields
  created_at: string;
}

export default function $ARGUMENTSPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<{ items: Item[] }>('/api/gmb/$ARGUMENTS?businessId=YOUR_BIZ_ID');
      setItems(data.items ?? []);
    } catch (err: any) {
      toast({ title: 'Failed to load', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/gmb/$ARGUMENTS?id=${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">$ARGUMENTS</h1>
            <p className="text-sm text-gray-500 mt-0.5">Description here</p>
          </div>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="font-medium text-gray-500">No items yet</p>
            <Button size="sm" className="mt-4" onClick={() => setSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create first item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Card key={item.id} className="bg-white border-gray-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.id}</p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setDeleteId(item.id)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Composer Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Add $ARGUMENTS</SheetTitle>
            <SheetDescription>Fill in the details below</SheetDescription>
          </SheetHeader>
          {/* Add form fields here */}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Step 4 — TypeScript Check

```bash
npx tsc --noEmit
```

Fix any errors before committing.

### Step 5 — Commit

```bash
git add app/api/gmb/$ARGUMENTS/ app/dashboard/$ARGUMENTS/
git commit -m "feat: add $ARGUMENTS feature"
```
```

- [ ] **Step 2: Verify file exists**

```bash
ls /home/pratik/Business/Locomo/.claude/commands/locomo-feature.md
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/locomo-feature.md
git commit -m "feat: add /locomo-feature project skill"
```

---

## Task 5: Verify Everything Works

- [ ] **Step 1: Confirm all files exist**

```bash
ls /home/pratik/Business/Locomo/CLAUDE.md
ls /home/pratik/Business/Locomo/.claude/commands/
```

Expected output for commands dir:
```
locomo-api.md
locomo-db.md
locomo-feature.md
```

- [ ] **Step 2: Verify CLAUDE.md is non-empty and well-formed**

```bash
wc -l /home/pratik/Business/Locomo/CLAUDE.md
```

Expected: 100+ lines

- [ ] **Step 3: Final commit if anything unstaged**

```bash
git status
```

If clean, done. If unstaged files remain:
```bash
git add CLAUDE.md .claude/commands/
git commit -m "feat: complete Locomo DX setup — CLAUDE.md + project skills"
```
