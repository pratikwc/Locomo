import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exchangeCodeForTokens, getUserInfo } from '@/lib/google-client';
import { validateOAuthState } from '@/lib/oauth-state';
import { getUserProfile, listGMBAccounts, listBusinessLocations, transformLocationToBusinessData } from '@/lib/gmb-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('[OAuth Callback] Received callback with params:', {
    hasCode: !!code,
    hasState: !!state,
    error: error || 'none',
  });

  if (error) {
    console.error('[OAuth Callback] Google OAuth error:', error);
    const errorMessages: Record<string, string> = {
      'access_denied': 'You denied access to your Google account',
      'invalid_scope': 'Invalid permissions requested',
      'unauthorized_client': 'Application is not authorized',
    };
    const message = errorMessages[error] || 'Google authorization failed';
    return NextResponse.redirect(
      new URL(`/google-connect?error=oauth_error&message=${encodeURIComponent(message)}`, request.url)
    );
  }

  if (!code || !state) {
    console.error('[OAuth Callback] Missing required parameters:', { code: !!code, state: !!state });
    return NextResponse.redirect(
      new URL('/google-connect?error=missing_params&message=Missing+required+parameters', request.url)
    );
  }

  const stateValidation = validateOAuthState(state);
  if (!stateValidation.valid) {
    console.error('[OAuth Callback] Invalid state:', stateValidation.error);
    return NextResponse.redirect(
      new URL(`/google-connect?error=invalid_state&message=${encodeURIComponent(stateValidation.error || 'Invalid state')}`, request.url)
    );
  }

  const userId = stateValidation.userId!;
  console.log('[OAuth Callback] Processing callback for user:', userId);

  try {
    console.log('[OAuth Callback] Exchanging code for tokens...');
    const tokenData = await exchangeCodeForTokens(code);

    if (!tokenData.access_token) {
      throw new Error('No access token received from Google');
    }

    console.log('[OAuth Callback] Fetching user info from Google...');
    const userInfo = await getUserInfo(tokenData.access_token);

    if (!userInfo.id || !userInfo.email) {
      throw new Error('Invalid user info received from Google');
    }

    console.log('[OAuth Callback] Google user info:', {
      email: userInfo.email,
      id: userInfo.id,
    });

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    console.log('[OAuth Callback] Fetching user profile from Google...');
    const userProfile = await getUserProfile(tokenData.access_token);

    console.log('[OAuth Callback] Checking for GMB accounts...');
    const gmbAccounts = await listGMBAccounts(tokenData.access_token);
    const hasGmbAccess = gmbAccounts.length > 0;
    const gmbAccountName = hasGmbAccess ? gmbAccounts[0].name : null;

    const onboardingStatus = hasGmbAccess ? 'completed' : 'no_account';

    const { data: existingAccount, error: fetchError } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[OAuth Callback] Database fetch error:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    let googleAccountId: string;

    if (existingAccount) {
      console.log('[OAuth Callback] Updating existing Google account:', existingAccount.id);
      const { error: updateError } = await supabase
        .from('google_accounts')
        .update({
          google_user_id: userInfo.id,
          email: userInfo.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || existingAccount.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: tokenData.scope ? tokenData.scope.split(' ') : existingAccount.scopes,
          display_name: userProfile.name,
          profile_photo_url: userProfile.picture,
          has_gmb_access: hasGmbAccess,
          gmb_account_name: gmbAccountName,
          onboarding_status: onboardingStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('[OAuth Callback] Database update error:', updateError);
        throw new Error(`Failed to update account: ${updateError.message}`);
      }
      googleAccountId = existingAccount.id;
    } else {
      console.log('[OAuth Callback] Creating new Google account');
      const { data: newAccount, error: insertError } = await supabase
        .from('google_accounts')
        .insert({
          user_id: userId,
          google_user_id: userInfo.id,
          email: userInfo.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
          display_name: userProfile.name,
          profile_photo_url: userProfile.picture,
          has_gmb_access: hasGmbAccess,
          gmb_account_name: gmbAccountName,
          onboarding_status: onboardingStatus,
        })
        .select('id')
        .single();

      if (insertError || !newAccount) {
        console.error('[OAuth Callback] Database insert error:', insertError);
        throw new Error(`Failed to create account: ${insertError?.message}`);
      }
      googleAccountId = newAccount.id;
    }

    if (hasGmbAccess && gmbAccountName) {
      console.log('[OAuth Callback] Fetching business locations...');
      const locations = await listBusinessLocations(tokenData.access_token, gmbAccountName);

      if (locations.length > 0) {
        console.log(`[OAuth Callback] Found ${locations.length} business location(s)`);

        for (const location of locations) {
          const businessData = transformLocationToBusinessData(location);

          const { data: existingBusiness } = await supabase
            .from('businesses')
            .select('id')
            .eq('business_id', businessData.businessId)
            .eq('user_id', userId)
            .maybeSingle();

          if (existingBusiness) {
            console.log('[OAuth Callback] Updating existing business:', businessData.name);
            await supabase
              .from('businesses')
              .update({
                ...businessData,
                google_account_id: googleAccountId,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingBusiness.id);
          } else {
            console.log('[OAuth Callback] Creating new business:', businessData.name);
            await supabase
              .from('businesses')
              .insert({
                user_id: userId,
                google_account_id: googleAccountId,
                ...businessData,
                last_synced_at: new Date().toISOString(),
              });
          }
        }
      }
    }

    console.log('[OAuth Callback] Successfully connected Google account');
    return NextResponse.redirect(new URL('/dashboard?success=google_connected', request.url));
  } catch (error: any) {
    console.error('[OAuth Callback] Error processing callback:', error);
    const message = error.message || 'Failed to connect Google account';
    return NextResponse.redirect(
      new URL(`/google-connect?error=auth_failed&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
