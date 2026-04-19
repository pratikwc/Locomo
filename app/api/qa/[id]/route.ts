import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['answer_status', 'ai_answer', 'final_answer'];
    const safe = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    const { data: qaItem } = await supabaseAdmin
      .from('qa_items')
      .select('id, business_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!qaItem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', qaItem.business_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('qa_items')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}
