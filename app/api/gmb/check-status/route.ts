import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Check Status] Checking for user:', userId);

    const { data: googleAccounts, error: accountError } = await supabaseAdmin
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    console.log('[Check Status] Google accounts found:', googleAccounts?.length || 0);

    if (accountError) {
      console.error('[Check Status] Account error:', accountError);
    }

    if (accountError || !googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json({
        connected: false,
        has_gmb_access: false,
        onboarding_status: 'not_started',
      });
    }

    const googleAccount = googleAccounts[0];

    const { data: businesses, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, business_id, last_synced_at')
      .eq('user_id', userId);

    return NextResponse.json({
      connected: true,
      has_gmb_access: googleAccount.has_gmb_access,
      onboarding_status: googleAccount.onboarding_status,
      display_name: googleAccount.display_name,
      profile_photo_url: googleAccount.profile_photo_url,
      email: googleAccount.email,
      businesses: businesses || [],
      last_synced: googleAccount.updated_at,
    });
  } catch (error: any) {
    console.error('[Check Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
