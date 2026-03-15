import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: googleAccounts, error: accountError } = await supabaseAdmin
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (accountError || !googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json({
        connected: false,
        has_gmb_access: false,
        onboarding_status: 'not_started',
        businesses: [],
      });
    }

    const googleAccount = googleAccounts[0];

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id, name, business_id, last_synced_at')
      .eq('user_id', userId);

    return NextResponse.json({
      connected: true,
      has_gmb_access: googleAccount.has_gmb_access ?? false,
      onboarding_status: googleAccount.onboarding_status ?? 'not_started',
      display_name: googleAccount.display_name ?? null,
      profile_photo_url: googleAccount.profile_photo_url ?? null,
      email: googleAccount.email ?? null,
      businesses: businesses || [],
      last_synced: googleAccount.updated_at,
    });
  } catch (error: any) {
    console.error('[Check Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status', connected: false, has_gmb_access: false, businesses: [] },
      { status: 500 }
    );
  }
}