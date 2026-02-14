import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: googleAccount, error: accountError } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (accountError || !googleAccount) {
      return NextResponse.json({
        connected: false,
        has_gmb_access: false,
        onboarding_status: 'not_started',
      });
    }

    const { data: businesses, error: businessError } = await supabase
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
