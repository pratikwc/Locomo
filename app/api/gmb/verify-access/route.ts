import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { discoverAccountsFromLocations, fetchWithRetry, GMBApiError } from '@/lib/gmb-client';
import { refreshAccessToken } from '@/lib/google-client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[GMB Verify] Starting verification for user:', userId);

    // Fetch the Google account
    const { data: googleAccount, error: fetchError } = await supabaseAdmin
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !googleAccount) {
      console.error('[GMB Verify] Google account not found:', fetchError);
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 404 }
      );
    }

    // Get fresh access token
    let accessToken: string;

    const expiresAt = new Date(googleAccount.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      accessToken = googleAccount.access_token;
    } else {
      console.log('[GMB Verify] Access token expired, refreshing...');

      try {
        const tokenData = await refreshAccessToken(googleAccount.refresh_token);
        accessToken = tokenData.access_token;

        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

        // Update token in database
        await supabaseAdmin
          .from('google_accounts')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', googleAccount.id);
      } catch (tokenError: any) {
        console.error('[GMB Verify] Token refresh failed:', tokenError);

        await supabaseAdmin
          .from('google_accounts')
          .update({
            onboarding_status: 'auth_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', googleAccount.id);

        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'Please reconnect your Google account',
            recoverySteps: [
              'Click "Disconnect" in settings',
              'Click "Connect Google Account" again',
              'Grant all requested permissions',
            ],
          },
          { status: 401 }
        );
      }
    }

    // Attempt to discover GMB account by checking for locations
    try {
      const result = await fetchWithRetry(
        () => discoverAccountsFromLocations(accessToken),
        3,
        2000
      );

      const hasGmbAccess = result !== null && result.locations.length > 0;
      const gmbAccountName = hasGmbAccess ? result.accountName : null;
      const onboardingStatus = hasGmbAccess ? 'completed' : 'no_account';

      console.log('[GMB Verify] Verification result:', {
        hasGmbAccess,
        locationCount: result?.locations.length || 0,
        accountName: gmbAccountName,
      });

      // Update the Google account with GMB access status
      const { error: updateError } = await supabaseAdmin
        .from('google_accounts')
        .update({
          has_gmb_access: hasGmbAccess,
          gmb_account_name: gmbAccountName,
          onboarding_status: onboardingStatus,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', googleAccount.id);

      if (updateError) {
        console.error('[GMB Verify] Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update verification status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        hasGmbAccess,
        locationCount: result?.locations.length || 0,
        onboardingStatus,
      });
    } catch (error: any) {
      const gmbError = error.gmbError as GMBApiError | undefined;

      console.error('[GMB Verify] Verification failed:', {
        message: error.message,
        code: gmbError?.code,
        retryable: gmbError?.retryable,
      });

      // Update database with failure status
      await supabaseAdmin
        .from('google_accounts')
        .update({
          has_gmb_access: false,
          onboarding_status: 'verification_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', googleAccount.id);

      if (gmbError) {
        return NextResponse.json(
          {
            error: 'verification_failed',
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
          error: 'verification_failed',
          message: error.message || 'Failed to verify GMB access',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[GMB Verify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
