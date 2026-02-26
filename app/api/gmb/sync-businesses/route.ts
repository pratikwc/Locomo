import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { listGMBAccounts, listBusinessLocations, transformLocationToBusinessData, fetchWithRetry, GMBApiError } from '@/lib/gmb-client';
import { getValidAccessToken } from '@/lib/google-token-manager';
import { getCachedData, setCachedData } from '@/lib/gmb-cache';

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

    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    // Try to get accounts from cache first
    let gmbAccounts = await getCachedData<any[]>(userId, 'gmb-accounts', {});

    if (!gmbAccounts) {
      try {
        gmbAccounts = await fetchWithRetry(
          () => listGMBAccounts(accessToken),
          3,
          2000
        );

        // Cache the result
        await setCachedData(userId, 'gmb-accounts', {}, gmbAccounts, { ttlMinutes: 5 });
      } catch (error: any) {
        const gmbError = error.gmbError as GMBApiError | undefined;
        console.error('[Sync Businesses] Error fetching GMB accounts:', error);

        if (gmbError) {
          return NextResponse.json(
            {
              error: 'gmb_api_error',
              message: gmbError.userMessage,
              code: gmbError.code,
              retryable: gmbError.retryable,
              retryAfter: gmbError.retryAfter,
              recoverySteps: gmbError.recoverySteps,
            },
            { status: gmbError.code }
          );
        }

        return NextResponse.json(
          {
            error: error.message || 'Failed to fetch GMB accounts',
            details: 'Check server logs for details.'
          },
          { status: 500 }
        );
      }
    } else {
      console.log('[Sync Businesses] Using cached GMB accounts');
    }

    if (gmbAccounts.length === 0) {
      return NextResponse.json(
        {
          error: 'No GMB accounts found',
          message: 'Your Google account is connected but no Business Profile accounts were found. Please ensure you have created a Google Business Profile and have the necessary permissions.',
          helpUrl: 'https://support.google.com/business/answer/2911778'
        },
        { status: 404 }
      );
    }

    const gmbAccountName = gmbAccounts[0].name;

    // Try to get locations from cache first
    let locations = await getCachedData<any[]>(userId, 'gmb-locations', { accountName: gmbAccountName });

    if (!locations) {
      try {
        locations = await fetchWithRetry(
          () => listBusinessLocations(accessToken, gmbAccountName),
          3,
          3000
        );

        // Cache the result for 1 hour
        await setCachedData(userId, 'gmb-locations', { accountName: gmbAccountName }, locations, { ttlMinutes: 60 });
      } catch (error: any) {
        const gmbError = error.gmbError as GMBApiError | undefined;
        console.error('[Sync Businesses] Error fetching locations:', error);

        if (gmbError) {
          return NextResponse.json(
            {
              error: 'gmb_api_error',
              message: gmbError.userMessage,
              code: gmbError.code,
              retryable: gmbError.retryable,
              retryAfter: gmbError.retryAfter,
              recoverySteps: gmbError.recoverySteps,
            },
            { status: gmbError.code }
          );
        }

        return NextResponse.json(
          {
            error: error.message || 'Failed to fetch business locations',
            details: 'Check server logs for details.'
          },
          { status: 500 }
        );
      }
    } else {
      console.log('[Sync Businesses] Using cached business locations');
    }

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
