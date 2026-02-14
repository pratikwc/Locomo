import { supabase } from './supabase';
import { refreshAccessToken } from './google-client';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const { data: googleAccount, error } = await supabase
      .from('google_accounts')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !googleAccount) {
      console.error('[Token Manager] Failed to fetch Google account:', error);
      return null;
    }

    if (!googleAccount.access_token || !googleAccount.refresh_token) {
      console.error('[Token Manager] Missing tokens in database');
      return null;
    }

    const expiresAt = new Date(googleAccount.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      return googleAccount.access_token;
    }

    console.log('[Token Manager] Access token expired or expiring soon, refreshing...');

    try {
      const tokenData = await refreshAccessToken(googleAccount.refresh_token);

      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      const { error: updateError } = await supabase
        .from('google_accounts')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Token Manager] Failed to update refreshed token:', updateError);
        return null;
      }

      console.log('[Token Manager] Successfully refreshed access token');
      return tokenData.access_token;
    } catch (refreshError) {
      console.error('[Token Manager] Failed to refresh token:', refreshError);
      return null;
    }
  } catch (error) {
    console.error('[Token Manager] Unexpected error:', error);
    return null;
  }
}

export async function isTokenExpired(expiresAt: string): Promise<boolean> {
  const expirationDate = new Date(expiresAt);
  return expirationDate <= new Date();
}

export async function disconnectGoogleAccount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('google_accounts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[Token Manager] Failed to disconnect account:', error);
      return false;
    }

    console.log('[Token Manager] Successfully disconnected Google account');
    return true;
  } catch (error) {
    console.error('[Token Manager] Unexpected error disconnecting:', error);
    return false;
  }
}
