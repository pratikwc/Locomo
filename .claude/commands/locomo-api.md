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
