import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getLocationInsights } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';

const INSIGHTS_COOLDOWN_HOURS = 24;
const FIRST_SYNC_DAYS = 90;
const INCREMENTAL_SYNC_DAYS = 8;

async function canSyncInsights(userId: string): Promise<{ allowed: boolean; nextSyncAt?: string }> {
  const cooldownTime = new Date(Date.now() - INSIGHTS_COOLDOWN_HOURS * 60 * 60 * 1000);

  const { data: recentSync } = await supabaseAdmin
    .from('gmb_sync_sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('sync_type', 'insights')
    .eq('status', 'completed')
    .gte('completed_at', cooldownTime.toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentSync) {
    const nextSyncAt = new Date(
      new Date(recentSync.completed_at).getTime() + INSIGHTS_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();
    return { allowed: false, nextSyncAt };
  }

  return { allowed: true };
}

async function isFirstSync(businessId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('analytics')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);

  return (count ?? 0) === 0;
}

function getDateRange(daysBack: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cooldownCheck = await canSyncInsights(userId);
    if (!cooldownCheck.allowed) {
      return NextResponse.json(
        { error: 'Sync cooldown active', nextSyncAt: cooldownCheck.nextSyncAt },
        { status: 429 }
      );
    }

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id, business_id, google_account_id')
      .eq('user_id', userId);

    if (!businesses?.length) {
      return NextResponse.json({ synced: 0, lastSyncedAt: new Date().toISOString() });
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get valid access token' }, { status: 401 });
    }

    const syncSessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await supabaseAdmin.from('gmb_sync_sessions').insert({
      id: syncSessionId,
      user_id: userId,
      sync_type: 'insights',
      status: 'running',
      started_at: now,
    });

    let totalRows = 0;

    try {
      for (const business of businesses) {
        if (!business.business_id) continue;

        const firstSync = await isFirstSync(business.id);
        const daysBack = firstSync ? FIRST_SYNC_DAYS : INCREMENTAL_SYNC_DAYS;
        const { startDate, endDate } = getDateRange(daysBack);

        const insights = await getLocationInsights(
          accessToken,
          business.business_id,
          startDate,
          endDate
        );

        if (!insights.dailyBreakdown.length) continue;

        const rows = insights.dailyBreakdown.map(day => ({
          business_id: business.id,
          date: day.date,
          views: day.profileViews,
          searches: day.profileViews,
          actions_phone: day.phoneCalls,
          actions_website: day.websiteClicks,
          actions_directions: day.directionRequests,
        }));

        const { error } = await supabaseAdmin
          .from('analytics')
          .upsert(rows, { onConflict: 'business_id,date' });

        if (error) {
          console.error(`[Sync Insights] Upsert error for business ${business.id}:`, error);
        } else {
          totalRows += rows.length;
        }
      }

      await supabaseAdmin
        .from('gmb_sync_sessions')
        .update({ status: 'completed', completed_at: now, items_processed: totalRows })
        .eq('id', syncSessionId);

      return NextResponse.json({ synced: totalRows, lastSyncedAt: now });
    } catch (error: any) {
      await supabaseAdmin
        .from('gmb_sync_sessions')
        .update({ status: 'failed', completed_at: now, last_error: { message: error.message } })
        .eq('id', syncSessionId);
      throw error;
    }
  } catch (error: any) {
    console.error('[Sync Insights] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync insights' }, { status: 500 });
  }
}
