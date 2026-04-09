import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

const ALLOWED_PATCH_FIELDS = ['auto_reply_enabled', 'auto_reply_min_rating'] as const;
type AllowedField = typeof ALLOWED_PATCH_FIELDS[number];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json(business);
  } catch (error: any) {
    console.error('[Get Business] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Only allow whitelisted fields to be patched
    const updates: Partial<Record<AllowedField, unknown>> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('businesses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Patch Business] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update business' }, { status: 500 });
  }
}
