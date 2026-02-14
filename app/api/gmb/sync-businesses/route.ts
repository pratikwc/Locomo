import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { listGMBAccounts, listBusinessLocations, transformLocationToBusinessData } from '@/lib/gmb-client';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: googleAccounts, error: accountError } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (accountError || !googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 400 }
      );
    }

    const googleAccount = googleAccounts[0];

    if (!googleAccount.has_gmb_access) {
      return NextResponse.json(
        { error: 'No GMB access', onboarding_status: googleAccount.onboarding_status },
        { status: 403 }
      );
    }

    const gmbAccounts = await listGMBAccounts(googleAccount.access_token);

    if (gmbAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No GMB accounts found' },
        { status: 404 }
      );
    }

    const gmbAccountName = gmbAccounts[0].name;
    const locations = await listBusinessLocations(googleAccount.access_token, gmbAccountName);

    let syncedCount = 0;

    for (const location of locations) {
      const businessData = transformLocationToBusinessData(location);

      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('business_id', businessData.businessId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingBusiness) {
        await supabase
          .from('businesses')
          .update({
            ...businessData,
            google_account_id: googleAccount.id,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBusiness.id);
      } else {
        await supabase
          .from('businesses')
          .insert({
            user_id: userId,
            google_account_id: googleAccount.id,
            ...businessData,
            last_synced_at: new Date().toISOString(),
          });
      }

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} business location(s)`,
    });
  } catch (error: any) {
    console.error('[Sync Businesses] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync businesses' },
      { status: 500 }
    );
  }
}
