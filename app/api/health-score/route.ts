import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: healthScore } = await supabase
      .from('health_scores')
      .select('*')
      .eq('business_id', businessId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      healthScore: healthScore || null,
    });
  } catch (error: any) {
    console.error('[Health Score] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch health score' },
      { status: 500 }
    );
  }
}
