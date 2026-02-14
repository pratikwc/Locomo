import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: googleAccount } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    return NextResponse.json({
      connected: !!googleAccount,
      account: googleAccount ? {
        email: googleAccount.email,
        connectedAt: googleAccount.created_at,
      } : null,
    });
  } catch (error) {
    console.error('Check connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
