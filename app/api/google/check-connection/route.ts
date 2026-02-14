import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
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

    const { data: googleAccount, error: fetchError } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Check Connection] Database error:', fetchError);
      return NextResponse.json(
        { error: 'Database error', connected: false },
        { status: 500 }
      );
    }

    if (!googleAccount) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

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
