import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: items } = await supabaseAdmin
      .from('qa_items')
      .select('*')
      .eq('business_id', businessId)
      .order('asked_at', { ascending: false });

    return NextResponse.json({ items: items ?? [] });
  } catch (error: any) {
    console.error('[QA GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch Q&A' }, { status: 500 });
  }
}
