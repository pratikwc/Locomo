import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export interface AutopilotConfig {
  id?: string;
  business_id: string;
  enabled: boolean;
  posts_per_week: number;
  preferred_days: string[];
  post_types: string[];
  tone: string;
  topics: string[];
  last_auto_post_at: string | null;
}

async function verifyOwnership(userId: string, businessId: string) {
  const { data } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    if (!await verifyOwnership(userId, businessId)) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data } = await supabaseAdmin
      .from('autopilot_configs')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    // Return defaults if no config yet
    const config: AutopilotConfig = data ?? {
      business_id: businessId,
      enabled: false,
      posts_per_week: 2,
      preferred_days: ['Wednesday', 'Friday'],
      post_types: ['STANDARD', 'OFFER'],
      tone: 'friendly',
      topics: [],
      last_auto_post_at: null,
    };

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[Scheduler GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { businessId, ...updates } = body;
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    if (!await verifyOwnership(userId, businessId)) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const allowed = ['enabled', 'posts_per_week', 'preferred_days', 'post_types', 'tone', 'topics'];
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

    const { data, error } = await supabaseAdmin
      .from('autopilot_configs')
      .upsert({ business_id: businessId, ...safe, updated_at: new Date().toISOString() }, { onConflict: 'business_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error('[Scheduler PATCH] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save config' }, { status: 500 });
  }
}
