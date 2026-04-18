import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

interface DailyAnalytic {
  date: string;
  views: number;
  phone_calls: number;
  website_clicks: number;
  direction_requests: number;
}

interface Totals {
  profileViews: number;
  phoneCalls: number;
  websiteClicks: number;
  directionRequests: number;
  clickRate: number;
}

function computeTotals(rows: any[]): Totals {
  const profileViews = rows.reduce((s, r) => s + (r.views ?? 0), 0);
  const phoneCalls = rows.reduce((s, r) => s + (r.actions_phone ?? 0), 0);
  const websiteClicks = rows.reduce((s, r) => s + (r.actions_website ?? 0), 0);
  const directionRequests = rows.reduce((s, r) => s + (r.actions_directions ?? 0), 0);
  const totalActions = phoneCalls + websiteClicks + directionRequests;
  const clickRate = profileViews > 0
    ? parseFloat(((totalActions / profileViews) * 100).toFixed(2))
    : 0;
  return { profileViews, phoneCalls, websiteClicks, directionRequests, clickRate };
}

function trendPct(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - prior) / prior) * 100).toFixed(1));
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const days = Math.min(parseInt(searchParams.get('days') ?? '28'), 90);

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - days);

    const priorStart = new Date(currentStart);
    priorStart.setDate(priorStart.getDate() - days);

    const [currentRows, priorRows, lastSync] = await Promise.all([
      supabaseAdmin
        .from('analytics')
        .select('date, views, actions_phone, actions_website, actions_directions')
        .eq('business_id', businessId)
        .gte('date', currentStart.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      supabaseAdmin
        .from('analytics')
        .select('views, actions_phone, actions_website, actions_directions')
        .eq('business_id', businessId)
        .gte('date', priorStart.toISOString().split('T')[0])
        .lt('date', currentStart.toISOString().split('T')[0]),
      supabaseAdmin
        .from('gmb_sync_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('sync_type', 'insights')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const current = currentRows.data ?? [];
    const prior = priorRows.data ?? [];

    const totals = computeTotals(current);
    const priorTotals = computeTotals(prior);

    const trends = {
      profileViews: trendPct(totals.profileViews, priorTotals.profileViews),
      phoneCalls: trendPct(totals.phoneCalls, priorTotals.phoneCalls),
      websiteClicks: trendPct(totals.websiteClicks, priorTotals.websiteClicks),
      directionRequests: trendPct(totals.directionRequests, priorTotals.directionRequests),
    };

    const insights: DailyAnalytic[] = current.map(r => ({
      date: r.date,
      views: r.views ?? 0,
      phone_calls: r.actions_phone ?? 0,
      website_clicks: r.actions_website ?? 0,
      direction_requests: r.actions_directions ?? 0,
    }));

    const lastSyncedAt = lastSync.data?.completed_at ?? null;
    const canSync = !lastSync.data || (
      Date.now() - new Date(lastSync.data.completed_at).getTime() > 24 * 60 * 60 * 1000
    );

    return NextResponse.json({ insights, totals, trends, lastSyncedAt, canSync });
  } catch (error: any) {
    console.error('[Analytics GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
