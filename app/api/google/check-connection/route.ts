import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTokenExpired } from '@/lib/google-token-manager';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', connected: false },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', connected: false },
        { status: 401 }
      );
    }

    console.log('[Check Connection] Checking for user:', payload.userId);

    const { data: googleAccounts, error: fetchError } = await supabaseAdmin
      .from('google_accounts')
      .select('*')
      .eq('user_id', payload.userId)
      .order('updated_at', { ascending: false});

    console.log('[Check Connection] Google accounts found:', googleAccounts?.length || 0);

    if (fetchError) {
      console.error('[Check Connection] Database error:', fetchError);
      return NextResponse.json(
        { error: 'Database error', connected: false },
        { status: 500 }
      );
    }

    if (!googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    const googleAccount = googleAccounts[0];
    const expired = await isTokenExpired(googleAccount.token_expires_at);

    return NextResponse.json({
      connected: true,
      account: {
        email: googleAccount.email,
        connectedAt: googleAccount.created_at,
        tokenExpired: expired,
        scopes: googleAccount.scopes || [],
      },
    });
  } catch (error) {
    console.error('[Check Connection] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', connected: false },
      { status: 500 }
    );
  }
}
