import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exchangeCodeForTokens, getUserInfo } from '@/lib/google-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/google-connect?error=missing_params', request.url));
    }

    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const tokenData = await exchangeCodeForTokens(code);
    const userInfo = await getUserInfo(tokenData.access_token);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const { data: existingAccount } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAccount) {
      await supabase
        .from('google_accounts')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || existingAccount.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);
    } else {
      await supabase
        .from('google_accounts')
        .insert({
          user_id: userId,
          google_user_id: userInfo.id,
          email: userInfo.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        });
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL('/google-connect?error=auth_failed', request.url));
  }
}
