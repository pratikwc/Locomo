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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';

interface Item {
  id: string;
  business_id: string;
  // add your fields here
  created_at: string;
}

export default function FeaturePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<{ items: Item[] }>('/api/gmb/$ARGUMENTS?businessId=REPLACE_ME');
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
